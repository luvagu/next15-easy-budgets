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
	isCreditSale: boolean
	paymentDueDate: Date
	items: SaleLineItemInput[]
}

export async function registerSale({
	userId,
	customerName,
	deliveryChargeUsd,
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
	const totalAmountUsd = subtotalUsd + deliveryChargeUsd

	// 4. Optionally create a Loan entry (deferred payment) — needs returning ID
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

	// 5. Insert invoice — needs returning ID for line items
	const [invoice] = await db
		.insert(SalesInvoicesTable)
		.values({
			clerkUserId: userId,
			customerName,
			subtotalUsd,
			deliveryChargeUsd,
			totalAmountUsd,
			loanId,
		})
		.returning({ id: SalesInvoicesTable.id })

	// 6. Batch: insert all line items + decrement all stock in one round-trip
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

	// 7. Revalidate caches
	revalidateInventoryCache({ userId })
	revalidateInvoicesCache({ id: invoice.id, userId })
	if (loanId) {
		revalidateLoansCache({ id: loanId, userId })
	}

	return { invoiceId: invoice.id, loanId }
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
