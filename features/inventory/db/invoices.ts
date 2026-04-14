import { db } from '@/drizzle/db'
import {
	InventoryItemsTable,
	LoansTable,
	SaleLineItemsTable,
	SalesInvoicesTable,
} from '@/drizzle/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
import {
	getInvoiceIdTag,
	getInvoicesGlobalTag,
	getUserInvoicesTag,
	revalidateInvoicesCache,
} from './cache'
import { revalidateInventoryCache } from './cache'
import { revalidateLoansCache } from '@/features/loans/db/cache'

type SaleLineItemInput = {
	itemId: string
	qty: number
}

type RegisterSaleInput = {
	userId: string
	customerName: string
	deliveryChargeUsd: number
	discountType: 'pct' | 'fixed'
	discountValue: number
	isCreditSale: boolean
	paymentDueDate: Date
	items: SaleLineItemInput[]
}

export async function registerSale({
	userId,
	customerName,
	deliveryChargeUsd,
	discountType,
	discountValue,
	isCreditSale,
	paymentDueDate,
	items,
}: RegisterSaleInput) {
	// 1. Fetch all selected items upfront (SELECT — outside batch)
	const dbItems = await db
		.select()
		.from(InventoryItemsTable)
		.where(
			and(
				eq(InventoryItemsTable.clerkUserId, userId),
				inArray(
					InventoryItemsTable.id,
					items.map(i => i.itemId),
				),
			),
		)

	// 2. Validate stock availability
	for (const lineItem of items) {
		const dbItem = dbItems.find(i => i.id === lineItem.itemId)
		if (!dbItem) throw new Error(`Item ${lineItem.itemId} not found`)
		if (dbItem.stockQty < lineItem.qty)
			throw new Error(`Insufficient stock for ${dbItem.name}`)
	}

	// 3. Calculate line totals with combo price evaluation
	const lineItemsData = items.map(li => {
		const dbItem = dbItems.find(i => i.id === li.itemId)!

		const effectiveSalePrice =
			dbItem.comboQtyThreshold != null &&
			dbItem.comboPriceUsd != null &&
			li.qty >= dbItem.comboQtyThreshold
				? dbItem.comboPriceUsd
				: dbItem.baseSalePriceUsd

		const lineTotalUsd = effectiveSalePrice * li.qty
		const lineProfitUsd = (effectiveSalePrice - dbItem.baseCostUsd) * li.qty

		return {
			itemId: li.itemId,
			qty: li.qty,
			snapshotUnitCostUsd: dbItem.baseCostUsd,
			snapshotSalePriceUsd: effectiveSalePrice,
			lineTotalUsd,
			lineProfitUsd,
		}
	})

	const subtotalUsd = lineItemsData.reduce(
		(sum, li) => sum + li.lineTotalUsd,
		0,
	)

	// 4. Apply discount
	const discountAmountUsd =
		discountValue <= 0
			? 0
			: discountType === 'pct'
				? subtotalUsd * (discountValue / 100)
				: discountValue

	const totalAmountUsd = Math.max(
		0,
		subtotalUsd + deliveryChargeUsd - discountAmountUsd,
	)

	// 5. Optionally create a Loan entry (deferred payment) — needs returning ID
	let loanId: string | null = null
	if (isCreditSale) {
		const [newLoan] = await db
			.insert(LoansTable)
			.values({
				clerkUserId: userId,
				name: `HB: ${customerName}`,
				totalDebt: totalAmountUsd,
				bgColor: 'emerald',
				isAgainst: false,
				dueDate: paymentDueDate,
			})
			.returning({ id: LoansTable.id })
		loanId = newLoan.id
	}

	// 6. Insert invoice — needs returning ID for line items
	const [invoice] = await db
		.insert(SalesInvoicesTable)
		.values({
			clerkUserId: userId,
			customerName,
			subtotalUsd,
			deliveryChargeUsd,
			discountType: discountValue > 0 ? discountType : null,
			discountAmountUsd,
			totalAmountUsd,
			loanId,
		})
		.returning({ id: SalesInvoicesTable.id })

	// 7. Batch: insert all line items + decrement all stock in one round-trip
	const lineItemInsert = db.insert(SaleLineItemsTable).values(
		lineItemsData.map(li => ({
			...li,
			invoiceId: invoice.id,
		})),
	)

	const stockUpdates = items.map(li =>
		db
			.update(InventoryItemsTable)
			.set({
				stockQty: sql`${InventoryItemsTable.stockQty} - ${li.qty}`,
			})
			.where(eq(InventoryItemsTable.id, li.itemId)),
	)

	await db.batch([lineItemInsert, ...stockUpdates] as [
		typeof lineItemInsert,
		...typeof stockUpdates,
	])

	// 8. Revalidate caches
	revalidateInventoryCache({ userId })
	revalidateInvoicesCache({ id: invoice.id, userId })
	if (loanId) {
		revalidateLoansCache({ id: loanId, userId })
	}

	return { invoiceId: invoice.id, loanId }
}

export async function cancelSale({
	invoiceId,
	userId,
}: {
	invoiceId: string
	userId: string
}) {
	// 1. Load the invoice with its line items
	const invoice = await db.query.SalesInvoicesTable.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.id, invoiceId), eq(fields.clerkUserId, userId)),
		with: { lineItems: true },
	})

	if (!invoice) throw new Error('Invoice not found')
	if (invoice.status === 'cancelled') throw new Error('Already cancelled')

	// 2. Restore stock for each line item that still has a linked item
	const itemsToRestore = invoice.lineItems.filter(li => li.itemId != null)

	const stockRestores = itemsToRestore.map(li =>
		db
			.update(InventoryItemsTable)
			.set({
				stockQty: sql`${InventoryItemsTable.stockQty} + ${li.qty}`,
			})
			.where(eq(InventoryItemsTable.id, li.itemId!)),
	)

	// 3. Mark invoice as cancelled
	const markCancelled = db
		.update(SalesInvoicesTable)
		.set({ status: 'cancelled', cancelledAt: new Date() })
		.where(eq(SalesInvoicesTable.id, invoiceId))

	if (stockRestores.length > 0) {
		await db.batch([markCancelled, ...stockRestores] as [
			typeof markCancelled,
			...typeof stockRestores,
		])
	} else {
		await markCancelled
	}

	// 4. Delete linked loan if present
	if (invoice.loanId) {
		await db.delete(LoansTable).where(eq(LoansTable.id, invoice.loanId))
		revalidateLoansCache({ id: invoice.loanId, userId })
	}

	// 5. Revalidate
	revalidateInventoryCache({ userId })
	revalidateInvoicesCache({ id: invoiceId, userId })
}

type ReturnLineInput = {
	lineItemId: string
	qtyToReturn: number
}

export async function processReturn({
	invoiceId,
	userId,
	items,
}: {
	invoiceId: string
	userId: string
	items: ReturnLineInput[]
}) {
	// 1. Load invoice with full line item data
	const invoice = await db.query.SalesInvoicesTable.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.id, invoiceId), eq(fields.clerkUserId, userId)),
		with: { lineItems: true },
	})

	if (!invoice) throw new Error('Invoice not found')
	if (invoice.status === 'cancelled') throw new Error('Invoice already cancelled')
	if (items.length === 0) throw new Error('No items specified')

	// 2. Validate each return line
	for (const ret of items) {
		const li = invoice.lineItems.find(l => l.id === ret.lineItemId)
		if (!li) throw new Error(`Line item ${ret.lineItemId} not in invoice`)
		if (ret.qtyToReturn <= 0) throw new Error('Return qty must be positive')
		const returnable = li.qty - li.refundedQty
		if (ret.qtyToReturn > returnable)
			throw new Error(`Can only return up to ${returnable} of ${li.id}`)
	}

	// 3. Compute new refundedQty per line item and determine new invoice status
	const updatedLineItems = invoice.lineItems.map(li => {
		const ret = items.find(r => r.lineItemId === li.id)
		return {
			...li,
			newRefundedQty: li.refundedQty + (ret?.qtyToReturn ?? 0),
		}
	})

	const allFullyReturned = updatedLineItems.every(
		li => li.newRefundedQty >= li.qty,
	)
	const newStatus = allFullyReturned ? 'cancelled' : 'partial_refund'

	// 3b. Recompute effective invoice total based on remaining (non-returned) qty
	const newSubtotalUsd = updatedLineItems.reduce((sum, li) => {
		const remaining = li.qty - li.newRefundedQty
		return sum + li.snapshotSalePriceUsd * remaining
	}, 0)

	// Recalculate discount against the new subtotal:
	//   pct  → re-apply the original percentage to the new subtotal
	//   fixed → cap at the new subtotal (can't discount more than the order value)
	let newDiscountAmountUsd = 0
	if (invoice.discountAmountUsd > 0 && invoice.discountType) {
		if (invoice.discountType === 'pct' && invoice.subtotalUsd > 0) {
			const originalPct = invoice.discountAmountUsd / invoice.subtotalUsd
			newDiscountAmountUsd = newSubtotalUsd * originalPct
		} else {
			newDiscountAmountUsd = Math.min(invoice.discountAmountUsd, newSubtotalUsd)
		}
	}

	const newTotalAmountUsd = Math.max(
		0,
		newSubtotalUsd + invoice.deliveryChargeUsd - newDiscountAmountUsd,
	)

	// 4. Build the batch — updateInvoice must be first (batch needs ≥ 1 item)
	const updateInvoice = db
		.update(SalesInvoicesTable)
		.set({
			status: newStatus,
			cancelledAt: allFullyReturned ? new Date() : null,
			totalAmountUsd: newTotalAmountUsd,
		})
		.where(eq(SalesInvoicesTable.id, invoiceId))

	const lineItemUpdates = items.map(ret => {
		const li = invoice.lineItems.find(l => l.id === ret.lineItemId)!
		return db
			.update(SaleLineItemsTable)
			.set({ refundedQty: li.refundedQty + ret.qtyToReturn })
			.where(eq(SaleLineItemsTable.id, ret.lineItemId))
	})

	const stockRestores = items.flatMap(ret => {
		const li = invoice.lineItems.find(l => l.id === ret.lineItemId)!
		if (!li.itemId) return []
		return [
			db
				.update(InventoryItemsTable)
				.set({
					stockQty: sql`${InventoryItemsTable.stockQty} + ${ret.qtyToReturn}`,
				})
				.where(eq(InventoryItemsTable.id, li.itemId)),
		]
	})

	await db.batch([updateInvoice, ...lineItemUpdates, ...stockRestores] as [
		typeof updateInvoice,
		...typeof lineItemUpdates,
	])

	// 5. Handle linked loan
	if (invoice.loanId) {
		if (allFullyReturned) {
			// Full cancellation — delete the loan entirely
			await db.delete(LoansTable).where(eq(LoansTable.id, invoice.loanId))
			revalidateLoansCache({ id: invoice.loanId, userId })
		} else {
			// Partial return — reduce totalDebt to the new invoice total and
			// recompute dueAmount using the same formula as recalculateLoanTotals:
			//   dueAmount = totalDebt - installmensTotal
			const [loanRow] = await db
				.select({ installmensTotal: LoansTable.installmensTotal })
				.from(LoansTable)
				.where(eq(LoansTable.id, invoice.loanId))

			const installmensTotal = loanRow?.installmensTotal ?? 0
			const newDueAmount = newTotalAmountUsd - installmensTotal

			await db
				.update(LoansTable)
				.set({
					totalDebt: newTotalAmountUsd,
					dueAmount: newDueAmount,
					updatedAt: new Date(),
				})
				.where(eq(LoansTable.id, invoice.loanId))

			revalidateLoansCache({ id: invoice.loanId, userId })
		}
	}

	// 6. Revalidate
	revalidateInventoryCache({ userId })
	revalidateInvoicesCache({ id: invoiceId, userId })

	return { newStatus }
}

// ─── QUERIES ─────────────────────────────────────────────────────

export async function getInvoicesByUser(
	userId: string,
	{ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
) {
	'use cache'

	cacheTag(getInvoicesGlobalTag(), getUserInvoicesTag(userId))

	return await db.query.SalesInvoicesTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		with: {
			lineItems: {
				with: { item: { columns: { name: true, brand: true } } },
			},
			loan: { columns: { id: true, name: true } },
		},
		orderBy: ({ createdAt }, { desc }) => desc(createdAt),
		limit,
		offset,
	})
}

export async function getInvoiceById({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	'use cache'

	cacheTag(getInvoiceIdTag(id))

	return await db.query.SalesInvoicesTable.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.id, id), eq(fields.clerkUserId, userId)),
		with: {
			lineItems: {
				with: { item: { columns: { name: true, brand: true, unit: true } } },
			},
			loan: true,
		},
	})
}
