import { ENTRY_TYPES } from '@/constants/types'
import { getGlobalTag, getIdTag, getItemsTag, getUserTag } from '@/lib/dataCache'
import { updateTag } from 'next/cache'

// ─── Budgets ─────────────────────────────────────────

export function getBudgetsGlobalTag() {
	return getGlobalTag(ENTRY_TYPES.BUDGETS)
}

export function getBudgetIdTag(id: string) {
	return getIdTag(ENTRY_TYPES.BUDGETS, id)
}

export function getUserBudgetsTag(userId: string) {
	return getUserTag(ENTRY_TYPES.BUDGETS, userId)
}

export function revalidateBudgetsCache({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	updateTag(getBudgetsGlobalTag())
	updateTag(getBudgetIdTag(id))
	updateTag(getUserBudgetsTag(userId))
}

// ─── Expenses ────────────────────────────────────────

export function getExpensesGlobalTag() {
	return getGlobalTag(ENTRY_TYPES.EXPENSES)
}

export function getExpenseIdTag(id: string) {
	return getIdTag(ENTRY_TYPES.EXPENSES, id)
}

export function getBudgetExpensesTag(parentId: string) {
	return getItemsTag(ENTRY_TYPES.EXPENSES, parentId)
}

export function revalidateExpensesCache({
	id,
	parentId,
}: {
	id: string
	parentId: string
}) {
	updateTag(getExpensesGlobalTag())
	updateTag(getExpenseIdTag(id))
	updateTag(getBudgetExpensesTag(parentId))
}
