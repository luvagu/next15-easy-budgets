import { ENTRY_TYPES } from '@/constants/types'
import { getGlobalTag, getIdTag, getUserTag } from '@/lib/dataCache'
import { revalidateTag } from 'next/cache'

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
	revalidateTag(getLoansGlobalTag())
	revalidateTag(getLoanIdTag(id))
	revalidateTag(getUserLoansTag(userId))
}
