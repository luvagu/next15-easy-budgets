import type {
	InventoryCategoriesTable,
	InventoryItemsTable,
	SaleLineItemsTable,
	SalesInvoicesTable,
} from '@/drizzle/schema'

export type InventoryCategory =
	typeof InventoryCategoriesTable.$inferSelect

export type InventoryItem = typeof InventoryItemsTable.$inferSelect

export type InventoryItemWithCategory = InventoryItem & {
	category: InventoryCategory
}

export type SalesInvoice = typeof SalesInvoicesTable.$inferSelect

export type SaleLineItem = typeof SaleLineItemsTable.$inferSelect

export type SaleLineItemWithItem = SaleLineItem & {
	item: { name: string; brand: string | null } | null
}

export type InvoiceWithLineItems = SalesInvoice & {
	lineItems: SaleLineItemWithItem[]
	loan: { id: string; name: string } | null
}

export type DashboardStats = {
	totalInventoryValue: number
	grossProfitMTD: number
	lowStockCount: number
	topItems: {
		itemId: string | null
		itemName: string
		totalProfit: number
		totalSold: number
	}[]
}

export type BulkUploadRowResolution =
	| { action: 'create' }
	| { action: 'merge'; mergeWithItemId: string }
	| { action: 'skip' }

export type BulkUploadValidationResult = {
	rowIndex: number
	status: 'new' | 'exact_match' | 'fuzzy_match' | 'error'
	exactMatch?: InventoryItem
	fuzzyMatches?: InventoryItem[]
	error?: string
}
