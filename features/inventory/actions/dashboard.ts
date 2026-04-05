'use server'

import { auth } from '@clerk/nextjs/server'
import {
	getTotalInventoryValue,
	getGrossProfitMTD,
	getLowStockCount,
	getTopPerformingItems,
} from '../db/items'
import type { DashboardStats } from '../types/inventory'

export async function getDashboardStats(): Promise<DashboardStats | null> {
	const { userId } = await auth()
	if (userId == null) return null

	const [totalInventoryValue, grossProfitMTD, lowStockCount, topItems] =
		await Promise.all([
			getTotalInventoryValue(userId),
			getGrossProfitMTD(userId),
			getLowStockCount(userId),
			getTopPerformingItems(userId, { limit: 3 }),
		])

	return {
		totalInventoryValue,
		grossProfitMTD,
		lowStockCount,
		topItems,
	}
}
