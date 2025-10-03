import { ENTRY_TYPES } from '@/constants/types'
import { getGlobalTag, getIdTag, getUserTag } from '@/lib/dataCache'
import { revalidateTag } from 'next/cache'

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
	revalidateTag(getBudgetsGlobalTag())
	revalidateTag(getBudgetIdTag(id))
	revalidateTag(getUserBudgetsTag(userId))
}
