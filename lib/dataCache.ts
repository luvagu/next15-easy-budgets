import { ENTRY_TYPES } from '@/constants/types'

type CACHE_TAG =
	| typeof ENTRY_TYPES.BUDGETS
	| typeof ENTRY_TYPES.LOANS
	| typeof ENTRY_TYPES.EXPENSES
	| typeof ENTRY_TYPES.INSTALLMENTS
	| 'users'

export function getGlobalTag(tag: CACHE_TAG) {
	return `global:${tag}` as const
}

export function getUserTag(tag: CACHE_TAG, userId: string) {
	return `user:${userId}-${tag}` as const
}

export function getIdTag(tag: CACHE_TAG, id: string) {
	return `id:${id}-${tag}` as const
}

export function getItemsTag(tag: CACHE_TAG, parentId: string) {
	return `items:${parentId}-${tag}` as const
}
