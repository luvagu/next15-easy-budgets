import { ENTRY_TYPES } from '@/constants/types'
import { getGlobalTag, getIdTag, getUserTag } from '@/lib/dataCache'
import { updateTag } from 'next/cache'

export function getTodosGlobalTag() {
	return getGlobalTag(ENTRY_TYPES.TODOS)
}

export function getUserTodosTag(userId: string) {
	return getUserTag(ENTRY_TYPES.TODOS, userId)
}

export function getTodoIdTag(id: string) {
	return getIdTag(ENTRY_TYPES.TODOS, id)
}

export function revalidateTodosCache({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	updateTag(getTodosGlobalTag())
	updateTag(getUserTodosTag(userId))
	updateTag(getTodoIdTag(id))
}
