'use server'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import {
	createCategory as createCategoryDB,
	deleteCategory as deleteCategoryDB,
	renameCategory as renameCategoryDB,
	getCategoriesWithItemCount,
} from '../db/categories'

export async function createCategory(name: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const category = await createCategoryDB({
			clerkUserId: userId,
			name: name.trim(),
		})

		return { error: false, message: t('success_generic'), data: category }
	} catch {
		return {
			error: true,
			message: t('error_generic'),
			reason: 'Category may already exist',
		}
	}
}

export async function getCategoriesWithCount() {
	const { userId } = await auth()

	if (userId == null) return []

	return getCategoriesWithItemCount(userId)
}

export async function renameCategory(id: string, newName: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const isSuccess = await renameCategoryDB({ id, newName, userId })
		return {
			error: !isSuccess,
			message: isSuccess ? t('success_generic') : t('error_generic'),
		}
	} catch {
		return {
			error: true,
			message: t('error_generic'),
			reason: 'Category name may already exist',
		}
	}
}

export async function deleteCategory(id: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const isSuccess = await deleteCategoryDB({ id, userId })
		return {
			error: !isSuccess,
			message: isSuccess ? t('success_generic') : t('error_generic'),
		}
	} catch (err) {
		return { error: true, message: (err as Error).message ?? t('error_generic') }
	}
}
