'use server'

import {
	getBudgetEntrySchema,
	getEntryItemSchema,
	getEntryItemsSchema,
	getMoveItemsSchema,
} from '@/features/shared/schemas/entries'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import {
	createBudget as createBudgetDB,
	deleteBudget as deleteBudgetDB,
	updateBudget as updateBudgetDB,
	createExpense as createExpenseDB,
	deleteExpense as deleteExpenseDB,
	updateBudgetExpenses as updateBudgetExpensesDB,
	moveBudgetExpenses as moveBudgetExpensesDB,
} from '@/features/budgets/db/budgets'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TABS } from '@/constants/types'

const BudgetEntrySchema = getBudgetEntrySchema()
const EntryItemSchema = getEntryItemSchema()
const UpdateEntryItemsSchema = getEntryItemsSchema()
const MoveItemsSchema = getMoveItemsSchema({})

export async function createBudget(
	unsafeData: z.infer<typeof BudgetEntrySchema>,
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
			availableQuota: data.totalQuota,
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
			`/${locale}/dashboard/budget/${newBudget.id}/edit?tab=${TABS.DETAILS}`,
		)
	} else {
		redirect(`/${locale}/dashboard?tab=${TABS.BUDGETS}`)
	}
}

export async function updateBudget(
	id: string,
	unsafeData: z.infer<typeof BudgetEntrySchema>,
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

export async function createExpense(
	unsafeData: z.infer<typeof EntryItemSchema>,
	parentId: string,
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
	unsafeData: z.infer<typeof UpdateEntryItemsSchema>,
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

export async function moveBudgetExpenses({
	oldParentId,
	unsafeData,
}: {
	oldParentId: string
	unsafeData: z.infer<typeof MoveItemsSchema>
}) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = MoveItemsSchema.safeParse(unsafeData)

	const errorMessage = t('error_moving_expenses')

	if (!success || userId == null || oldParentId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	const isSuccess = await moveBudgetExpensesDB({
		oldParentId,
		newParentId: data.newParentId,
		expenses: data.items.map(item => ({ id: item })),
		userId,
	})

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_moving_expenses') : errorMessage,
	}
}
