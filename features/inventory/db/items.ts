import { db } from '@/drizzle/db'
import {
	InventoryItemsTable,
	SaleLineItemsTable,
	SalesInvoicesTable,
} from '@/drizzle/schema'
import { and, desc, eq, gte, lte, sql, count } from 'drizzle-orm'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
import {
	getInventoryGlobalTag,
	getInventoryItemIdTag,
	getUserInventoryTag,
	revalidateInventoryCache,
} from './cache'

// ─── CRUD ────────────────────────────────────────────────────────

export async function createItem(
	data: typeof InventoryItemsTable.$inferInsert,
) {
	const [newItem] = await db
		.insert(InventoryItemsTable)
		.values(data)
		.returning()

	revalidateInventoryCache({ id: newItem.id, userId: data.clerkUserId })

	return newItem
}

export async function updateItem(
	data: Partial<typeof InventoryItemsTable.$inferInsert>,
	{ id, userId }: { id: string; userId: string },
) {
	const { rowCount } = await db
		.update(InventoryItemsTable)
		.set(data)
		.where(
			and(
				eq(InventoryItemsTable.id, id),
				eq(InventoryItemsTable.clerkUserId, userId),
			),
		)

	const isSuccess = rowCount > 0

	if (isSuccess) {
		revalidateInventoryCache({ id, userId })
	}

	return isSuccess
}

export async function deleteItem({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const { rowCount } = await db
		.delete(InventoryItemsTable)
		.where(
			and(
				eq(InventoryItemsTable.id, id),
				eq(InventoryItemsTable.clerkUserId, userId),
			),
		)

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateInventoryCache({ id, userId })
	}

	return isDeleted
}

// ─── QUERIES ─────────────────────────────────────────────────────

export async function getItemById({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	'use cache'

	cacheTag(getInventoryItemIdTag(id))

	return await db.query.InventoryItemsTable.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.id, id), eq(fields.clerkUserId, userId)),
		with: { category: true },
	})
}

export async function getItemsByUser(
	userId: string,
	{
		limit = 50,
		offset = 0,
		categoryId,
		brand,
	}: {
		limit?: number
		offset?: number
		categoryId?: string
		brand?: string
	} = {},
) {
	'use cache'

	cacheTag(getInventoryGlobalTag(), getUserInventoryTag(userId))

	const conditions = [eq(InventoryItemsTable.clerkUserId, userId)]

	if (categoryId) {
		conditions.push(eq(InventoryItemsTable.categoryId, categoryId))
	}
	if (brand) {
		conditions.push(eq(InventoryItemsTable.brand, brand))
	}

	return await db.query.InventoryItemsTable.findMany({
		where: and(...conditions),
		with: { category: true },
		orderBy: ({ createdAt }, { desc }) => desc(createdAt),
		limit,
		offset,
	})
}

export async function getItemsCount(
	userId: string,
	{ categoryId }: { categoryId?: string } = {},
) {
	'use cache'

	cacheTag(getInventoryGlobalTag(), getUserInventoryTag(userId))

	const conditions = [eq(InventoryItemsTable.clerkUserId, userId)]

	if (categoryId) {
		conditions.push(eq(InventoryItemsTable.categoryId, categoryId))
	}

	const [result] = await db
		.select({ count: count() })
		.from(InventoryItemsTable)
		.where(and(...conditions))

	return result.count
}

export async function getDistinctBrands(userId: string) {
	'use cache'

	cacheTag(getInventoryGlobalTag(), getUserInventoryTag(userId))

	const rows = await db
		.selectDistinct({ brand: InventoryItemsTable.brand })
		.from(InventoryItemsTable)
		.where(
			and(
				eq(InventoryItemsTable.clerkUserId, userId),
				sql`${InventoryItemsTable.brand} IS NOT NULL`,
			),
		)
		.orderBy(InventoryItemsTable.brand)

	return rows.map(r => r.brand).filter(Boolean) as string[]
}

// ─── WAC (Weighted Average Cost) ────────────────────────────────

export async function addStock({
	id,
	userId,
	addedQty,
	newCostPerUnit,
}: {
	id: string
	userId: string
	addedQty: number
	newCostPerUnit: number
}) {
	const item = await db.query.InventoryItemsTable.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.id, id), eq(fields.clerkUserId, userId)),
	})

	if (!item) throw new Error('Item not found')

	const totalOldValue = item.baseCostUsd * item.stockQty
	const totalNewValue = newCostPerUnit * addedQty
	const newTotalQty = item.stockQty + addedQty
	const newBaseCostUsd =
		newTotalQty > 0
			? (totalOldValue + totalNewValue) / newTotalQty
			: newCostPerUnit

	const newBaseSalePriceUsd = newBaseCostUsd * (1 + item.profitMarginPct / 100)

	await db
		.update(InventoryItemsTable)
		.set({
			baseCostUsd: newBaseCostUsd,
			baseSalePriceUsd: newBaseSalePriceUsd,
			stockQty: newTotalQty,
		})
		.where(
			and(
				eq(InventoryItemsTable.id, id),
				eq(InventoryItemsTable.clerkUserId, userId),
			),
		)

	revalidateInventoryCache({ id, userId })
}

// ─── DUPLICATE DETECTION ────────────────────────────────────────

export async function findSimilarItems(
	userId: string,
	name: string,
	brand?: string,
) {
	const normalizedName = name.trim().toLowerCase()
	const normalizedBrand = brand?.trim().toLowerCase() ?? null

	// Exact match: same name (case-insensitive) regardless of brand or category.
	// Brand is intentionally not required so that same-name/different-brand items
	// are still surfaced as exact duplicates rather than silently created.
	const exactMatches = await db
		.select()
		.from(InventoryItemsTable)
		.where(
			and(
				eq(InventoryItemsTable.clerkUserId, userId),
				sql`LOWER(${InventoryItemsTable.name}) = ${normalizedName}`,
			),
		)

	// Build the set of exact-match IDs so we can exclude them from fuzzy
	const exactIds = exactMatches.map(i => i.id)

	// Fuzzy match: ILIKE name similarity, excluding any row already in exact results.
	// We do NOT filter by brand or category so that cross-category near-duplicates
	// are surfaced for the user to resolve.
	const fuzzyConditions = [
		eq(InventoryItemsTable.clerkUserId, userId),
		sql`(
			LOWER(${InventoryItemsTable.name}) ILIKE ${'%' + normalizedName + '%'}
			OR ${normalizedName} ILIKE '%' || LOWER(${InventoryItemsTable.name}) || '%'
		)`,
	]

	// Also include brand-only similarity if a brand was provided
	if (normalizedBrand) {
		fuzzyConditions[1] = sql`(
			LOWER(${InventoryItemsTable.name}) ILIKE ${'%' + normalizedName + '%'}
			OR ${normalizedName} ILIKE '%' || LOWER(${InventoryItemsTable.name}) || '%'
			OR LOWER(COALESCE(${InventoryItemsTable.brand}, '')) ILIKE ${'%' + normalizedBrand + '%'}
		)`
	}

	// Exclude items already returned as exact matches
	if (exactIds.length > 0) {
		fuzzyConditions.push(
			sql`${InventoryItemsTable.id} NOT IN (${sql.join(
				exactIds.map(id => sql`${id}`),
				sql`, `,
			)})`,
		)
	}

	const fuzzyMatches = await db
		.select()
		.from(InventoryItemsTable)
		.where(and(...fuzzyConditions))
		.limit(5)

	return { exact: exactMatches, fuzzy: fuzzyMatches }
}

// ─── DASHBOARD STATS ────────────────────────────────────────────

export async function getTotalInventoryValue(userId: string) {
	'use cache'

	cacheTag(getInventoryGlobalTag(), getUserInventoryTag(userId))

	const [result] = await db
		.select({
			total: sql<number>`COALESCE(SUM(${InventoryItemsTable.stockQty} * ${InventoryItemsTable.baseCostUsd}), 0)`,
		})
		.from(InventoryItemsTable)
		.where(
			and(
				eq(InventoryItemsTable.clerkUserId, userId),
				sql`${InventoryItemsTable.stockQty} > 0`,
			),
		)

	return Number(result.total)
}

export async function getGrossProfitMTD(userId: string) {
	'use cache'

	cacheTag(getInventoryGlobalTag(), getUserInventoryTag(userId))

	const now = new Date()
	const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

	const [result] = await db
		.select({
			total: sql<number>`COALESCE(SUM(${SaleLineItemsTable.lineProfitUsd}), 0)`,
		})
		.from(SaleLineItemsTable)
		.innerJoin(
			SalesInvoicesTable,
			eq(SaleLineItemsTable.invoiceId, SalesInvoicesTable.id),
		)
		.where(
			and(
				eq(SalesInvoicesTable.clerkUserId, userId),
				gte(SalesInvoicesTable.createdAt, firstOfMonth),
			),
		)

	return Number(result.total)
}

export async function getLowStockCount(userId: string) {
	'use cache'

	cacheTag(getInventoryGlobalTag(), getUserInventoryTag(userId))

	const [result] = await db
		.select({ count: count() })
		.from(InventoryItemsTable)
		.where(
			and(
				eq(InventoryItemsTable.clerkUserId, userId),
				lte(InventoryItemsTable.stockQty, 5),
			),
		)

	return result.count
}

export async function getTopPerformingItems(
	userId: string,
	{ limit = 3 }: { limit?: number } = {},
) {
	'use cache'

	cacheTag(getInventoryGlobalTag(), getUserInventoryTag(userId))

	const rows = await db
		.select({
			itemId: SaleLineItemsTable.itemId,
			itemName: InventoryItemsTable.name,
			totalProfit: sql<number>`COALESCE(SUM(${SaleLineItemsTable.lineProfitUsd}), 0)`,
			totalSold: sql<number>`COALESCE(SUM(${SaleLineItemsTable.qty}), 0)`,
		})
		.from(SaleLineItemsTable)
		.innerJoin(
			SalesInvoicesTable,
			eq(SaleLineItemsTable.invoiceId, SalesInvoicesTable.id),
		)
		.innerJoin(
			InventoryItemsTable,
			eq(SaleLineItemsTable.itemId, InventoryItemsTable.id),
		)
		.where(eq(SalesInvoicesTable.clerkUserId, userId))
		.groupBy(SaleLineItemsTable.itemId, InventoryItemsTable.name)
		.orderBy(desc(sql`SUM(${SaleLineItemsTable.lineProfitUsd})`))
		.limit(limit)

	return rows.map(r => ({
		itemId: r.itemId,
		itemName: r.itemName,
		totalProfit: Number(r.totalProfit),
		totalSold: Number(r.totalSold),
	}))
}
