import { db } from '@/drizzle/db'
import {
	InventoryCategoriesTable,
	InventoryItemsTable,
} from '@/drizzle/schema'
import { and, count, eq, sql } from 'drizzle-orm'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
import {
	getCategoriesGlobalTag,
	getUserCategoriesTag,
	revalidateCategoriesCache,
	revalidateInventoryCache,
} from './cache'

export async function createCategory(
	data: typeof InventoryCategoriesTable.$inferInsert
) {
	const [newCategory] = await db
		.insert(InventoryCategoriesTable)
		.values(data)
		.returning()

	revalidateCategoriesCache({ userId: data.clerkUserId })

	return newCategory
}

export async function getCategoriesByUser(userId: string) {
	'use cache'

	cacheTag(getCategoriesGlobalTag(), getUserCategoriesTag(userId))

	return await db.query.InventoryCategoriesTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		orderBy: ({ name }, { asc }) => asc(name),
	})
}

export async function getCategoriesWithItemCount(userId: string) {
	'use cache'

	cacheTag(getCategoriesGlobalTag(), getUserCategoriesTag(userId))

	const rows = await db
		.select({
			id: InventoryCategoriesTable.id,
			name: InventoryCategoriesTable.name,
			itemCount: count(InventoryItemsTable.id),
		})
		.from(InventoryCategoriesTable)
		.leftJoin(
			InventoryItemsTable,
			eq(InventoryItemsTable.categoryId, InventoryCategoriesTable.id),
		)
		.where(eq(InventoryCategoriesTable.clerkUserId, userId))
		.groupBy(InventoryCategoriesTable.id, InventoryCategoriesTable.name)
		.orderBy(InventoryCategoriesTable.name)

	return rows
}

export async function findCategoryByName(userId: string, name: string) {
	return await db.query.InventoryCategoriesTable.findFirst({
		where: ({ clerkUserId, name: catName }, { and, eq }) =>
			and(
				eq(clerkUserId, userId),
				sql`LOWER(${catName}) = ${name.trim().toLowerCase()}`
			),
	})
}

export async function findOrCreateCategory(userId: string, name: string) {
	const existing = await findCategoryByName(userId, name)
	if (existing) return existing

	return await createCategory({
		clerkUserId: userId,
		name: name.trim(),
	})
}

export async function renameCategory({
	id,
	newName,
	userId,
}: {
	id: string
	newName: string
	userId: string
}) {
	const { rowCount } = await db
		.update(InventoryCategoriesTable)
		.set({ name: newName.trim(), updatedAt: new Date() })
		.where(
			and(
				eq(InventoryCategoriesTable.id, id),
				eq(InventoryCategoriesTable.clerkUserId, userId),
			),
		)

	if (rowCount > 0) {
		revalidateCategoriesCache({ userId })
		revalidateInventoryCache({ userId })
	}

	return rowCount > 0
}

export async function deleteCategory({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	// Guard: refuse if any items reference this category
	const [{ itemCount }] = await db
		.select({ itemCount: count() })
		.from(InventoryItemsTable)
		.where(eq(InventoryItemsTable.categoryId, id))

	if (itemCount > 0) {
		throw new Error(
			`Cannot delete: ${itemCount} item(s) are assigned to this category. Reassign them first.`,
		)
	}

	const { rowCount } = await db
		.delete(InventoryCategoriesTable)
		.where(
			and(
				eq(InventoryCategoriesTable.id, id),
				eq(InventoryCategoriesTable.clerkUserId, userId)
			)
		)

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateCategoriesCache({ userId })
	}

	return isDeleted
}
