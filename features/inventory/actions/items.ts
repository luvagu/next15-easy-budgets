'use server'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import {
	getInventoryItemSchema,
	getAddStockSchema,
	getBulkUploadRowSchema,
} from '../schemas/inventory'
import {
	createItem as createItemDB,
	updateItem as updateItemDB,
	deleteItem as deleteItemDB,
	addStock as addStockDB,
	findSimilarItems,
	getBrandsWithItemCount,
	renameBrand as renameBrandDB,
	deleteBrand as deleteBrandDB,
} from '../db/items'
import { findOrCreateCategory } from '../db/categories'
import { revalidateInventoryCache, revalidateCategoriesCache } from '../db/cache'
import type { BulkUploadRowResolution } from '../types/inventory'
import { InventoryItemsTable } from '@/drizzle/schema'
import { db } from '@/drizzle/db'
import { and, eq, sql } from 'drizzle-orm'
import { findOrCreateCategory as findOrCreateCategoryDB } from '../db/categories'

const ItemSchema = getInventoryItemSchema({})
const StockSchema = getAddStockSchema()

// ─── CREATE / UPDATE / DELETE ────────────────────────────────────

export async function addOrUpdateItem(
	unsafeData: z.infer<typeof ItemSchema>,
	existingId?: string
) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	const { success, data } = ItemSchema.safeParse(unsafeData)
	if (!success) {
		return { error: true, message: t('error_generic') }
	}

	try {
		const category = await findOrCreateCategory(userId, data.categoryName)

		// Prefer the user-typed sale price to preserve exact decimal entry;
		// fall back to cost × (1 + margin/100) when not explicitly provided.
		const baseSalePriceUsd =
			data.baseSalePriceUsd ?? data.baseCostUsd * (1 + data.profitMarginPct / 100)

		const itemData = {
			clerkUserId: userId,
			categoryId: category.id,
			name: data.name,
			brand: data.brand ?? null,
			unit: data.unit,
			baseCostUsd: data.baseCostUsd,
			profitMarginPct: data.profitMarginPct,
			baseSalePriceUsd,
			comboQtyThreshold: data.comboQtyThreshold ?? null,
			comboPriceUsd: data.comboPriceUsd ?? null,
		}

		if (existingId) {
			await updateItemDB(itemData, { id: existingId, userId })
			return { error: false, message: t('success_generic') }
		} else {
			const newItem = await createItemDB({
				...itemData,
				stockQty: data.initialStock ?? 0,
			})
			return { error: false, message: t('success_generic'), data: newItem }
		}
	} catch {
		return {
			error: true,
			message: t('error_generic'),
			reason: 'Item may already exist with that name and brand',
		}
	}
}

export async function deleteItem(id: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const isSuccess = await deleteItemDB({ id, userId })
		return {
			error: !isSuccess,
			message: isSuccess ? t('success_generic') : t('error_generic'),
		}
	} catch (err) {
		return { error: true, message: (err as Error).message ?? t('error_generic') }
	}
}

// ─── ADD STOCK (WAC) ────────────────────────────────────────────

export async function addStock(
	itemId: string,
	unsafeData: z.infer<typeof StockSchema>
) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	const { success, data } = StockSchema.safeParse(unsafeData)
	if (!success) {
		return { error: true, message: t('error_generic') }
	}

	try {
		await addStockDB({
			id: itemId,
			userId,
			addedQty: data.qty,
			newCostPerUnit: data.costPerUnit,
		})

		return { error: false, message: t('success_generic') }
	} catch {
		return { error: true, message: t('error_generic') }
	}
}

// ─── DUPLICATE DETECTION ────────────────────────────────────────

export async function checkDuplicates(name: string, brand?: string) {
	const { userId } = await auth()
	if (userId == null) return { exact: [], fuzzy: [] }

	return findSimilarItems(userId, name, brand)
}

// ─── BRAND MANAGEMENT ───────────────────────────────────────────

export async function getBrandsWithCount() {
	const { userId } = await auth()

	if (userId == null) return []

	return getBrandsWithItemCount(userId)
}

export async function renameBrand(oldName: string, newName: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const isSuccess = await renameBrandDB({ oldName, newName: newName.trim(), userId })
		return {
			error: !isSuccess,
			message: isSuccess ? t('success_generic') : t('error_generic'),
		}
	} catch {
		return { error: true, message: t('error_generic') }
	}
}

export async function deleteBrand(name: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const rowCount = await deleteBrandDB({ name, userId })
		return { error: false, message: t('success_generic'), data: { rowCount } }
	} catch {
		return { error: true, message: t('error_generic') }
	}
}

// ─── BULK UPLOAD: VALIDATE ──────────────────────────────────────

type BulkUploadRow = z.infer<ReturnType<typeof getBulkUploadRowSchema>>

export async function validateBulkUpload(rows: BulkUploadRow[]) {
	const { userId } = await auth()

	if (userId == null) {
		return { error: true, message: 'Unauthorized', results: [] }
	}

	const RowSchema = getBulkUploadRowSchema()
	const results: {
		rowIndex: number
		status: 'new' | 'exact_match' | 'fuzzy_match' | 'error'
		exactMatch?: { id: string; name: string; brand: string | null; stockQty: number; baseCostUsd: number }
		fuzzyMatches?: { id: string; name: string; brand: string | null; stockQty: number; baseCostUsd: number }[]
		error?: string
	}[] = []

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i]

		// Validate schema first
		const parsed = RowSchema.safeParse(row)
		if (!parsed.success) {
			results.push({
				rowIndex: i,
				status: 'error',
				error: parsed.error.issues.map(e => e.message).join(', '),
			})
			continue
		}

		// Check for duplicates
		const { exact, fuzzy } = await findSimilarItems(
			userId,
			parsed.data.name,
			parsed.data.brand
		)

		if (exact.length > 0) {
			results.push({
				rowIndex: i,
				status: 'exact_match',
				exactMatch: {
					id: exact[0].id,
					name: exact[0].name,
					brand: exact[0].brand,
					stockQty: exact[0].stockQty,
					baseCostUsd: exact[0].baseCostUsd,
				},
			})
		} else if (fuzzy.length > 0) {
			results.push({
				rowIndex: i,
				status: 'fuzzy_match',
				fuzzyMatches: fuzzy.map(f => ({
					id: f.id,
					name: f.name,
					brand: f.brand,
					stockQty: f.stockQty,
					baseCostUsd: f.baseCostUsd,
				})),
			})
		} else {
			results.push({ rowIndex: i, status: 'new' })
		}
	}

	return { error: false, results }
}

// ─── BULK UPLOAD: PROCESS ───────────────────────────────────────

export async function processBulkUpload(input: {
	rows: BulkUploadRow[]
	resolutions: Record<number, BulkUploadRowResolution>
	priceConflictResolution?: 'margin' | 'salePrice'
}) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	const RowSchema = getBulkUploadRowSchema()
	let created = 0
	let merged = 0
	let skipped = 0

	try {
		// Phase 1: Collect all merge target IDs and fetch them in one query
		const mergeTargetIds: string[] = []
		for (let i = 0; i < input.rows.length; i++) {
			const resolution = input.resolutions[i]
			if (resolution?.action === 'merge' && 'mergeWithItemId' in resolution) {
				mergeTargetIds.push(resolution.mergeWithItemId)
			}
		}

		const mergeTargets =
			mergeTargetIds.length > 0
				? await db
						.select()
						.from(InventoryItemsTable)
						.where(
							and(
								eq(InventoryItemsTable.clerkUserId, userId),
								sql`${InventoryItemsTable.id} IN ${mergeTargetIds}`
							)
						)
				: []

		const mergeTargetMap = new Map(mergeTargets.map(item => [item.id, item]))

		// Phase 2: Resolve categories for all "create" rows upfront
		const categoryCache = new Map<string, string>() // lowercase name → id
		for (let i = 0; i < input.rows.length; i++) {
			const resolution = input.resolutions[i] ?? { action: 'create' as const }
			if (resolution.action === 'skip') continue

			const parsed = RowSchema.safeParse(input.rows[i])
			if (!parsed.success) continue

			if (resolution.action !== 'merge') {
				const catKey = parsed.data.category.trim().toLowerCase()
				if (!categoryCache.has(catKey)) {
					const category = await findOrCreateCategoryDB(
						userId,
						parsed.data.category.trim()
					)
					categoryCache.set(catKey, category.id)
				}
			}
		}

		// Phase 3: Build all mutation queries
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const queries: any[] = []

		for (let i = 0; i < input.rows.length; i++) {
			const row = input.rows[i]
			const resolution = input.resolutions[i] ?? { action: 'create' as const }

			if (resolution.action === 'skip') {
				skipped++
				continue
			}

			const parsed = RowSchema.safeParse(row)
			if (!parsed.success) {
				skipped++
				continue
			}
			const data = parsed.data

			if (
				resolution.action === 'merge' &&
				'mergeWithItemId' in resolution
			) {
				const existingItem = mergeTargetMap.get(resolution.mergeWithItemId)
				if (!existingItem) {
					throw new Error(`Merge target not found for row ${i}`)
				}

				const totalOldValue = existingItem.baseCostUsd * existingItem.stockQty
				const totalNewValue = data.cost * data.stock
				const newTotalQty = existingItem.stockQty + data.stock
				const newBaseCostUsd =
					newTotalQty > 0
						? (totalOldValue + totalNewValue) / newTotalQty
						: data.cost
				const newBaseSalePriceUsd =
					newBaseCostUsd * (1 + existingItem.profitMarginPct / 100)

				queries.push(
					db
						.update(InventoryItemsTable)
						.set({
							baseCostUsd: newBaseCostUsd,
							baseSalePriceUsd: newBaseSalePriceUsd,
							stockQty: newTotalQty,
						})
						.where(eq(InventoryItemsTable.id, resolution.mergeWithItemId))
				)

				merged++
			} else {
				const catKey = data.category.trim().toLowerCase()
				const categoryId = categoryCache.get(catKey)!

				// Use salePrice to derive margin unless user explicitly chose "margin" priority
				const useSalePrice =
					data.salePrice !== undefined &&
					input.priceConflictResolution !== 'margin'
				const finalMargin = useSalePrice && data.cost > 0
					? ((data.salePrice! - data.cost) / data.cost) * 100
					: data.margin
				const finalSalePrice = data.cost * (1 + finalMargin / 100)

				queries.push(
					db.insert(InventoryItemsTable).values({
						clerkUserId: userId,
						categoryId,
						name: data.name,
						brand: data.brand ?? null,
						unit: data.unit,
						baseCostUsd: data.cost,
						profitMarginPct: parseFloat(finalMargin.toFixed(4)),
						baseSalePriceUsd: finalSalePrice,
						stockQty: data.stock,
					})
				)

				created++
			}
		}

		// Phase 4: Execute all mutations in a single batch
		if (queries.length > 0) {
			await db.batch(queries as [typeof queries[0], ...typeof queries])
		}

		revalidateInventoryCache({ userId })
		revalidateCategoriesCache({ userId })

		return {
			error: false,
			message: `Bulk upload complete: ${created} created, ${merged} merged, ${skipped} skipped`,
		}
	} catch (err) {
		return { error: true, message: (err as Error).message }
	}
}
