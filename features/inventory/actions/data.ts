'use server'

import { auth } from '@clerk/nextjs/server'
import {
	getItemsByUser,
	getItemsCount,
	getDistinctBrands,
} from '../db/items'
import { getCategoriesByUser } from '../db/categories'

export async function fetchInventoryData(filters?: {
	categoryId?: string
	brand?: string
}) {
	const { userId } = await auth()
	if (userId == null) return null

	const [items, categories, brands, totalCount] = await Promise.all([
		getItemsByUser(userId, {
			categoryId: filters?.categoryId,
			brand: filters?.brand,
		}),
		getCategoriesByUser(userId),
		getDistinctBrands(userId),
		getItemsCount(userId),
	])

	return { items, categories, brands, totalCount }
}
