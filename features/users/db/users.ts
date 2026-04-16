import { db } from '@/drizzle/db'
import { eq } from 'drizzle-orm'
import {
	BudgetsTable,
	InventoryCategoriesTable,
	InventoryItemsTable,
	LoansTable,
	SalesInvoicesTable,
	TodosTable,
} from '@/drizzle/schema'
import { revalidateTag } from 'next/cache'
import {
	getBudgetsGlobalTag,
	getUserBudgetsTag,
} from '@/features/budgets/db/cache'
import { getLoansGlobalTag, getUserLoansTag } from '@/features/loans/db/cache'
import { getTodosGlobalTag, getUserTodosTag } from '@/features/todos/db/cache'
import {
	getCategoriesGlobalTag,
	getInventoryGlobalTag,
	getInvoicesGlobalTag,
	getUserCategoriesTag,
	getUserInventoryTag,
	getUserInvoicesTag,
} from '@/features/inventory/db/cache'
import { getUserIdTag, getUsersGlobalTag } from './cache'

export async function deleteUser(clerkUserId: string) {
	// Delete in FK-safe order within a single batch (Neon executes serially):
	//  1. sales_invoices  → DB cascades sale_line_items
	//                       (sale_line_items.itemId is RESTRICT, so invoices must go first)
	//  2. inventory_items → safe now that sale_line_items are gone
	//  3. inventory_categories → safe now that inventory_items are gone
	//  4. budgets         → DB cascades expenses
	//  5. loans           → DB cascades installments
	//  6. todos           → no dependants
	const rowCount = await db.batch([
		db
			.delete(SalesInvoicesTable)
			.where(eq(SalesInvoicesTable.clerkUserId, clerkUserId)),
		db
			.delete(InventoryItemsTable)
			.where(eq(InventoryItemsTable.clerkUserId, clerkUserId)),
		db
			.delete(InventoryCategoriesTable)
			.where(eq(InventoryCategoriesTable.clerkUserId, clerkUserId)),
		db.delete(BudgetsTable).where(eq(BudgetsTable.clerkUserId, clerkUserId)),
		db.delete(LoansTable).where(eq(LoansTable.clerkUserId, clerkUserId)),
		db.delete(TodosTable).where(eq(TodosTable.clerkUserId, clerkUserId)),
	])

	// Called from a Route Handler (Clerk webhook) — must use revalidateTag, not updateTag.
	// No client router cache flush is needed here; we only need to purge the data cache
	// so future server renders fetch fresh data.
	revalidateTag(getBudgetsGlobalTag(), 'max')
	revalidateTag(getUserBudgetsTag(clerkUserId), 'max')
	revalidateTag(getLoansGlobalTag(), 'max')
	revalidateTag(getUserLoansTag(clerkUserId), 'max')
	revalidateTag(getTodosGlobalTag(), 'max')
	revalidateTag(getUserTodosTag(clerkUserId), 'max')
	revalidateTag(getInventoryGlobalTag(), 'max')
	revalidateTag(getUserInventoryTag(clerkUserId), 'max')
	revalidateTag(getCategoriesGlobalTag(), 'max')
	revalidateTag(getUserCategoriesTag(clerkUserId), 'max')
	revalidateTag(getInvoicesGlobalTag(), 'max')
	revalidateTag(getUserInvoicesTag(clerkUserId), 'max')
	revalidateTag(getUsersGlobalTag(), 'max')
	revalidateTag(getUserIdTag(clerkUserId), 'max')

	return rowCount.length
}
