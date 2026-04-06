import { ENTRY_TYPES } from '@/constants/types'
import { getGlobalTag, getIdTag, getItemsTag, getUserTag } from '@/lib/dataCache'
import { updateTag } from 'next/cache'

// ─── Loans ───────────────────────────────────────────

export function getLoansGlobalTag() {
	return getGlobalTag(ENTRY_TYPES.LOANS)
}

export function getLoanIdTag(id: string) {
	return getIdTag(ENTRY_TYPES.LOANS, id)
}

export function getUserLoansTag(userId: string) {
	return getUserTag(ENTRY_TYPES.LOANS, userId)
}

export function revalidateLoansCache({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	updateTag(getLoansGlobalTag())
	updateTag(getLoanIdTag(id))
	updateTag(getUserLoansTag(userId))
}

// ─── Installments ────────────────────────────────────

export function getInstallmentsGlobalTag() {
	return getGlobalTag(ENTRY_TYPES.INSTALLMENTS)
}

export function getInstallmentIdTag(id: string) {
	return getIdTag(ENTRY_TYPES.INSTALLMENTS, id)
}

export function getLoanInstallmentsTag(parentId: string) {
	return getItemsTag(ENTRY_TYPES.INSTALLMENTS, parentId)
}

export function revalidateInstallmentsCache({
	id,
	parentId,
}: {
	id: string
	parentId: string
}) {
	updateTag(getInstallmentsGlobalTag())
	updateTag(getInstallmentIdTag(id))
	updateTag(getLoanInstallmentsTag(parentId))
}
