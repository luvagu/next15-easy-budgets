'use server'

import { auth } from '@clerk/nextjs/server'
import { getItemsByUser, getDistinctBrands } from '../db/items'
import { getCategoriesByUser } from '../db/categories'

export async function fetchInventoryData(filters?: {
	categoryId?: string
	brand?: string
	search?: string
	limit?: number
	offset?: number
}) {
	const { userId } = await auth()
	if (userId == null) return null

	const [{ items, totalCount }, categories, brands] = await Promise.all([
		getItemsByUser(userId, {
			categoryId: filters?.categoryId,
			brand: filters?.brand,
			search: filters?.search,
			limit: filters?.limit,
			offset: filters?.offset,
		}),
		getCategoriesByUser(userId),
		getDistinctBrands(userId),
	])

	return { items, categories, brands, totalCount }
}
