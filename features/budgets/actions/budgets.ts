'use server'

import { getBudgetEntrySchema } from '@/schemas/entries'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import {
	createBudget as createBudgetDB,
	deleteBudget as deleteBudgetDB,
	updateBudget as updateBudgetDB,
} from '@/features/budgets/db/budgets'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TABS } from '@/constants/types'

const BudgetEntrySchema = getBudgetEntrySchema()

export async function createBudget(
	unsafeData: z.infer<typeof BudgetEntrySchema>
): Promise<{ error: boolean; message: string; reason?: string } | undefined> {
	const { userId } = await auth()
	const locale = await getLocale()
	const t = await getTranslations('server_messages')

	const { success, data } = BudgetEntrySchema.safeParse(unsafeData)
	const errorMessage = t('error_creating_budget')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	let newBudget

	try {
		newBudget = await createBudgetDB({
			...data,
			clerkUserId: userId,
		})
	} catch {
		return {
			error: true,
			message: errorMessage,
			reason: t('error_budget_not_unique', { name: data.name }),
		}
	}

	if (newBudget != null) {
		redirect(
			`/${locale}/dashboard/budget/${newBudget.id}/edit?tab=${TABS.DETAILS}`
		)
	} else {
		redirect(`/${locale}/dashboard?tab=${TABS.BUDGETS}`)
	}
}

export async function updateBudget(
	id: string,
	unsafeData: z.infer<typeof BudgetEntrySchema>
): Promise<{ error: boolean; message: string; reason?: string } | undefined> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = BudgetEntrySchema.safeParse(unsafeData)
	const errorMessage = t('error_updating_budget')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	try {
		await updateBudgetDB(data, {
			id,
			userId,
		})

		return {
			error: false,
			message: t('success_updating_budget'),
		}
	} catch {
		return {
			error: true,
			message: errorMessage,
			reason: t('error_budget_not_unique', { name: data.name }),
		}
	}
}

export async function deleteBudget(id: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const errorMessage = t('error_deleting_budget')

	if (userId == null) {
		return { error: true, message: errorMessage }
	}

	const isSuccess = await deleteBudgetDB({ id, userId })

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_deleting_budget') : errorMessage,
	}
}
