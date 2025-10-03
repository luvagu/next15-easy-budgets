'use server'

import { getEntryItemSchema, getEntryItemsSchema } from '@/schemas/entries'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TABS } from '@/constants/types'
import {
	createExpense as createExpenseDB,
	deleteExpense as deleteExpenseDB,
	updateBudgetExpenses as updateBudgetExpensesDB,
} from '@/features/expenses/db/expenses'

const EntryItemSchema = getEntryItemSchema()
const UpdateEntryItemsSchema = getEntryItemsSchema()

export async function createExpense(
	unsafeData: z.infer<typeof EntryItemSchema>,
	parentId: string
): Promise<{ error: boolean; message: string } | undefined> {
	const { userId } = await auth()
	const locale = await getLocale()
	const t = await getTranslations('server_messages')

	const { success, data } = EntryItemSchema.safeParse(unsafeData)
	const errorMessage = t('error_creating_expense')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	try {
		await createExpenseDB({ ...data, parentId }, { userId })
	} catch {
		return {
			error: true,
			message: errorMessage,
		}
	}

	redirect(`/${locale}/dashboard/budget/${parentId}/edit?tab=${TABS.ITEMS}`)
}

export async function deleteExpense({
	id,
	parentId,
}: {
	id: string
	parentId?: string
}) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const errorMessage = t('error_deleting_expense')

	if (userId == null || parentId == null) {
		return { error: true, message: errorMessage }
	}

	const isSuccess = await deleteExpenseDB({
		id,
		parentId,
		userId,
	})

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_deleting_expense') : errorMessage,
	}
}

export async function updateBudgetExpenses(
	parentId: string,
	unsafeData: z.infer<typeof UpdateEntryItemsSchema>
) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = UpdateEntryItemsSchema.safeParse(unsafeData)
	const errorMessage = t('error_saving_budget_expenses')
	if (
		!success ||
		userId == null ||
		data.items == null ||
		data.items.length === 0
	) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	const expenses = data.items.map(expense => ({ ...expense, parentId }))

	const isSuccess = await updateBudgetExpensesDB(expenses, { parentId, userId })

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_saving_budget_expenses') : errorMessage,
	}
}
