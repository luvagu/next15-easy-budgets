import { getGlobalTag, getIdTag } from '@/lib/dataCache'
import { updateTag } from 'next/cache'

export function getUsersGlobalTag() {
	return getGlobalTag('users')
}

export function getUserIdTag(id: string) {
	return getIdTag('users', id)
}

export function revalidateUsersCache(id: string) {
	updateTag(getUsersGlobalTag())
	updateTag(getUserIdTag(id))
}
