import { getGlobalTag, getIdTag } from '@/lib/dataCache'
import { revalidateTag } from 'next/cache'

export function getUsersGlobalTag() {
	return getGlobalTag('users')
}

export function getUserIdTag(id: string) {
	return getIdTag('users', id)
}

export function revalidateUsersCache(id: string) {
	revalidateTag(getUsersGlobalTag(), 'max')
	revalidateTag(getUserIdTag(id), 'max')
}
