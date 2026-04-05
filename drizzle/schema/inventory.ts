import { relations } from 'drizzle-orm'
import {
	index,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
} from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from '../schemaHelpers'
import { LoansTable } from './loans'

// ─── INVENTORY CATEGORIES ────────────────────────────────────────

export const InventoryCategoriesTable = pgTable(
	'inventory_categories',
	{
		id,
		clerkUserId: text('clerk_user_id').notNull(),
		name: text('name').notNull(),
		createdAt,
		updatedAt,
	},
	table => [
		index('inventory_categories.clerk_user_id_index').on(table.clerkUserId),
		unique('inventory_categories.user_name_unique').on(
			table.clerkUserId,
			table.name
		),
	]
)

// ─── INVENTORY ITEMS ─────────────────────────────────────────────

export const InventoryItemsTable = pgTable(
	'inventory_items',
	{
		id,
		clerkUserId: text('clerk_user_id').notNull(),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => InventoryCategoriesTable.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		brand: text('brand'),
		unit: text('unit').notNull(),
		baseCostUsd: real('base_cost_usd').notNull(),
		profitMarginPct: real('profit_margin_pct').notNull(),
		baseSalePriceUsd: real('base_sale_price_usd').notNull(),
		stockQty: integer('stock_qty').notNull().default(0),
		comboQtyThreshold: integer('combo_qty_threshold'),
		comboPriceUsd: real('combo_price_usd'),
		createdAt,
		updatedAt,
	},
	table => [
		index('inventory_items.clerk_user_id_index').on(table.clerkUserId),
		index('inventory_items.category_id_index').on(table.categoryId),
		unique('inventory_items.user_name_brand_unique').on(
			table.clerkUserId,
			table.name,
			table.brand
		),
	]
)

// ─── SALES INVOICES ──────────────────────────────────────────────

export const SalesInvoicesTable = pgTable(
	'sales_invoices',
	{
		id,
		clerkUserId: text('clerk_user_id').notNull(),
		customerName: text('customer_name').notNull(),
		subtotalUsd: real('subtotal_usd').notNull(),
		deliveryChargeUsd: real('delivery_charge_usd').notNull().default(0),
		totalAmountUsd: real('total_amount_usd').notNull(),
		loanId: uuid('loan_id').references(() => LoansTable.id, {
			onDelete: 'set null',
		}),
		createdAt,
	},
	table => [
		index('sales_invoices.clerk_user_id_index').on(table.clerkUserId),
	]
)

// ─── SALE LINE ITEMS ─────────────────────────────────────────────

export const SaleLineItemsTable = pgTable(
	'sale_line_items',
	{
		id,
		invoiceId: uuid('invoice_id')
			.notNull()
			.references(() => SalesInvoicesTable.id, { onDelete: 'cascade' }),
		itemId: uuid('item_id').references(() => InventoryItemsTable.id, {
			onDelete: 'set null',
		}),
		qty: integer('qty').notNull(),
		snapshotUnitCostUsd: real('snapshot_unit_cost_usd').notNull(),
		snapshotSalePriceUsd: real('snapshot_sale_price_usd').notNull(),
		lineTotalUsd: real('line_total_usd').notNull(),
		lineProfitUsd: real('line_profit_usd').notNull(),
	},
	table => [
		index('sale_line_items.invoice_id_index').on(table.invoiceId),
		index('sale_line_items.item_id_index').on(table.itemId),
	]
)

// ─── EXCHANGE RATES CACHE (Global — no clerkUserId) ──────────────

export const ExchangeRatesCacheTable = pgTable('exchange_rates_cache', {
	currencyCode: text('currency_code').primaryKey(),
	rateToUsd: real('rate_to_usd').notNull(),
	lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

// ─── RELATIONS ───────────────────────────────────────────────────

export const inventoryCategoriesRelations = relations(
	InventoryCategoriesTable,
	({ many }) => ({
		items: many(InventoryItemsTable),
	})
)

export const inventoryItemsRelations = relations(
	InventoryItemsTable,
	({ one, many }) => ({
		category: one(InventoryCategoriesTable, {
			fields: [InventoryItemsTable.categoryId],
			references: [InventoryCategoriesTable.id],
		}),
		saleLineItems: many(SaleLineItemsTable),
	})
)

export const salesInvoicesRelations = relations(
	SalesInvoicesTable,
	({ one, many }) => ({
		loan: one(LoansTable, {
			fields: [SalesInvoicesTable.loanId],
			references: [LoansTable.id],
		}),
		lineItems: many(SaleLineItemsTable),
	})
)

export const saleLineItemsRelations = relations(
	SaleLineItemsTable,
	({ one }) => ({
		invoice: one(SalesInvoicesTable, {
			fields: [SaleLineItemsTable.invoiceId],
			references: [SalesInvoicesTable.id],
		}),
		item: one(InventoryItemsTable, {
			fields: [SaleLineItemsTable.itemId],
			references: [InventoryItemsTable.id],
		}),
	})
)
