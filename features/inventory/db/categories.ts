import { db } from '@/drizzle/db'
import { InventoryCategoriesTable } from '@/drizzle/schema'
import { and, eq, sql } from 'drizzle-orm'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
import {
	getCategoriesGlobalTag,
	getUserCategoriesTag,
	revalidateCategoriesCache,
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

export async function deleteCategory({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
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
