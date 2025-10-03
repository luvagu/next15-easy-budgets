import { ENTRY_TYPES } from '@/constants/types'
import { getItemsTag, getGlobalTag, getIdTag } from '@/lib/dataCache'
import { revalidateTag } from 'next/cache'

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
	revalidateTag(getExpensesGlobalTag())
	revalidateTag(getExpenseIdTag(id))
	revalidateTag(getBudgetExpensesTag(parentId))
}
