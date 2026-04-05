/**
 * Inventory Seed Script
 *
 * Run via: npx tsx features/inventory/seed/seed-inventory.ts
 *
 * Seeds the database with sample categories, inventory items, and
 * historical sales so the dashboard has data to display.
 *
 * IMPORTANT: Set SEED_USER_ID to your Clerk userId before running.
 */

import { db } from '@/drizzle/db'
import {
	ExchangeRatesCacheTable,
	InventoryCategoriesTable,
	InventoryItemsTable,
	LoansTable,
	SaleLineItemsTable,
	SalesInvoicesTable,
} from '@/drizzle/schema'

const SEED_USER_ID = process.env.SEED_USER_ID ?? 'YOUR_CLERK_USER_ID_HERE'

async function seed() {
	console.log('🌱 Seeding inventory data...')

	// ─── 1. Exchange Rates ───────────────────────────────────────

	await db
		.insert(ExchangeRatesCacheTable)
		.values([
			{
				currencyCode: 'USD',
				rateToUsd: 1.0,
				lastFetchedAt: new Date(),
			},
			{
				currencyCode: 'EUR',
				rateToUsd: 0.92,
				lastFetchedAt: new Date(Date.now() - 2 * 86400000), // 2 days ago — forces refresh
			},
			{
				currencyCode: 'VES',
				rateToUsd: 36.5,
				lastFetchedAt: new Date(Date.now() - 2 * 86400000),
			},
		])
		.onConflictDoNothing()

	console.log('  ✓ Exchange rates seeded')

	// ─── 2. Categories ───────────────────────────────────────────

	const [meats, dairy, grains, beverages] = await db
		.insert(InventoryCategoriesTable)
		.values([
			{ clerkUserId: SEED_USER_ID, name: 'Meats' },
			{ clerkUserId: SEED_USER_ID, name: 'Dairy' },
			{ clerkUserId: SEED_USER_ID, name: 'Grains' },
			{ clerkUserId: SEED_USER_ID, name: 'Beverages' },
		])
		.returning()

	console.log('  ✓ 4 categories created')

	// ─── 3. Inventory Items ──────────────────────────────────────

	const [chicken, cheese, rice, milk, coffee] = await db
		.insert(InventoryItemsTable)
		.values([
			{
				clerkUserId: SEED_USER_ID,
				categoryId: meats.id,
				name: 'Chicken Breast',
				brand: 'FarmFresh',
				unit: 'kg',
				baseCostUsd: 3.5,
				profitMarginPct: 40,
				baseSalePriceUsd: 3.5 * 1.4, // 4.90
				stockQty: 50,
			},
			{
				clerkUserId: SEED_USER_ID,
				categoryId: dairy.id,
				name: 'Mozzarella Cheese',
				brand: 'La Cremosa',
				unit: 'kg',
				baseCostUsd: 5.0,
				profitMarginPct: 35,
				baseSalePriceUsd: 5.0 * 1.35, // 6.75
				stockQty: 30,
				comboQtyThreshold: 5,
				comboPriceUsd: 6.0,
			},
			{
				clerkUserId: SEED_USER_ID,
				categoryId: grains.id,
				name: 'White Rice',
				brand: null,
				unit: 'kg',
				baseCostUsd: 1.2,
				profitMarginPct: 25,
				baseSalePriceUsd: 1.2 * 1.25, // 1.50
				stockQty: 200,
			},
			{
				clerkUserId: SEED_USER_ID,
				categoryId: dairy.id,
				name: 'Whole Milk',
				brand: 'DairyPure',
				unit: 'liter',
				baseCostUsd: 0.9,
				profitMarginPct: 30,
				baseSalePriceUsd: 0.9 * 1.3, // 1.17
				stockQty: 3, // low stock!
			},
			{
				clerkUserId: SEED_USER_ID,
				categoryId: beverages.id,
				name: 'Ground Coffee',
				brand: 'MonteCristo',
				unit: 'kg',
				baseCostUsd: 8.0,
				profitMarginPct: 50,
				baseSalePriceUsd: 8.0 * 1.5, // 12.00
				stockQty: 15,
			},
		])
		.returning()

	console.log('  ✓ 5 inventory items created')

	// ─── 4. Historical Sales ─────────────────────────────────────

	// Sale 1: Cash sale (no loan) — 3 days ago
	const sale1Date = new Date()
	sale1Date.setDate(sale1Date.getDate() - 3)

	const [invoice1] = await db
		.insert(SalesInvoicesTable)
		.values({
			clerkUserId: SEED_USER_ID,
			customerName: 'María López',
			subtotalUsd: 4.9 * 5 + 1.5 * 10, // 24.50 + 15.00 = 39.50
			deliveryChargeUsd: 2.0,
			totalAmountUsd: 41.5,
			loanId: null,
			createdAt: sale1Date,
		})
		.returning()

	await db.insert(SaleLineItemsTable).values([
		{
			invoiceId: invoice1.id,
			itemId: chicken.id,
			qty: 5,
			snapshotUnitCostUsd: 3.5,
			snapshotSalePriceUsd: 4.9,
			lineTotalUsd: 24.5,
			lineProfitUsd: (4.9 - 3.5) * 5, // 7.00
		},
		{
			invoiceId: invoice1.id,
			itemId: rice.id,
			qty: 10,
			snapshotUnitCostUsd: 1.2,
			snapshotSalePriceUsd: 1.5,
			lineTotalUsd: 15.0,
			lineProfitUsd: (1.5 - 1.2) * 10, // 3.00
		},
	])

	// Sale 2: Deferred payment (creates loan) — 1 day ago
	const sale2Date = new Date()
	sale2Date.setDate(sale2Date.getDate() - 1)
	const dueDate = new Date()
	dueDate.setDate(dueDate.getDate() + 14)

	const [loan] = await db
		.insert(LoansTable)
		.values({
			clerkUserId: SEED_USER_ID,
			name: 'Sale: Carlos Ramírez',
			totalDebt: 48.75,
			bgColor: 'emerald',
			isAgainst: false,
			dueDate,
		})
		.returning()

	const [invoice2] = await db
		.insert(SalesInvoicesTable)
		.values({
			clerkUserId: SEED_USER_ID,
			customerName: 'Carlos Ramírez',
			subtotalUsd: 6.75 * 3 + 12.0 * 2, // 20.25 + 24.00 = 44.25
			deliveryChargeUsd: 4.5,
			totalAmountUsd: 48.75,
			loanId: loan.id,
			createdAt: sale2Date,
		})
		.returning()

	await db.insert(SaleLineItemsTable).values([
		{
			invoiceId: invoice2.id,
			itemId: cheese.id,
			qty: 3,
			snapshotUnitCostUsd: 5.0,
			snapshotSalePriceUsd: 6.75,
			lineTotalUsd: 20.25,
			lineProfitUsd: (6.75 - 5.0) * 3, // 5.25
		},
		{
			invoiceId: invoice2.id,
			itemId: coffee.id,
			qty: 2,
			snapshotUnitCostUsd: 8.0,
			snapshotSalePriceUsd: 12.0,
			lineTotalUsd: 24.0,
			lineProfitUsd: (12.0 - 8.0) * 2, // 8.00
		},
	])

	console.log('  ✓ 2 sales invoices created (1 cash, 1 with loan)')
	console.log('')
	console.log('📊 Expected dashboard stats:')
	console.log(
		`   Total Inventory Value: $${(50 * 3.5 + 30 * 5.0 + 200 * 1.2 + 3 * 0.9 + 15 * 8.0).toFixed(2)}`
	)
	console.log(
		`   Gross Profit (MTD):    $${(7.0 + 3.0 + 5.25 + 8.0).toFixed(2)}`
	)
	console.log(`   Low Stock Alerts:      1 (Whole Milk = 3)`)
	console.log(`   Top 3 by Profit:       Coffee ($8.00), Chicken ($7.00), Cheese ($5.25)`)
	console.log('')
	console.log('✅ Seed complete!')
}

seed()
	.then(() => process.exit(0))
	.catch(err => {
		console.error('❌ Seed failed:', err)
		process.exit(1)
	})
