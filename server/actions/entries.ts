'use server'

import {
	getBudgetEntrySchema,
	getEntryItemSchema,
	getLoanEntrySchema,
	getEntryItemsSchema,
	getMoveItemsSchema,
} from '@/schemas/entries'
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
} from '@/server/db/budgets'
import {
	createLoan as createLoanDB,
	deleteLoan as deleteLoanDb,
	updateLoan as updateLoanDB,
	createInstallment as createInstallmentDB,
	deleteInstallment as deleteInstallmentDB,
	updateLoanInstallments as updateLoanInstallmentsDB,
	moveLoanInstallments as moveLoanInstallmentsDB,
} from '@/server/db/loans'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TABS } from '@/constants/types'

const BudgetEntrySchema = getBudgetEntrySchema()
const LoanEntrySchema = getLoanEntrySchema()
const EntryItemSchema = getEntryItemSchema()
const UpdateEntryItemsSchema = getEntryItemsSchema()
const MoveItemsSchema = getMoveItemsSchema({})

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

// Loans -->
export async function createLoan(unsafeData: z.infer<typeof LoanEntrySchema>) {
	const { userId } = await auth()
	const locale = await getLocale()
	const t = await getTranslations('server_messages')

	const { success, data } = LoanEntrySchema.safeParse(unsafeData)
	const errorMessage = t('error_creating_loan')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	let newLoan

	try {
		newLoan = await createLoanDB({
			...data,
			clerkUserId: userId,
		})
	} catch {
		return {
			error: true,
			message: errorMessage,
			reason: t('error_loan_not_unique', { name: data.name }),
		}
	}

	if (newLoan != null) {
		redirect(`/${locale}/dashboard/loan/${newLoan.id}/edit?tab=${TABS.DETAILS}`)
	} else {
		redirect(`/${locale}/dashboard?tab=${TABS.LOANS}`)
	}
}

export async function updateLoan(
	id: string,
	unsafeData: z.infer<typeof LoanEntrySchema>
): Promise<{ error: boolean; message: string; reason?: string } | undefined> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = LoanEntrySchema.safeParse(unsafeData)
	const errorMessage = t('error_updating_loan')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	try {
		await updateLoanDB(data, {
			id,
			userId,
		})

		return {
			error: false,
			message: t('success_updating_loan'),
		}
	} catch {
		return {
			error: true,
			message: errorMessage,
			reason: t('error_loan_not_unique', { name: data.name }),
		}
	}
}

export async function deleteLoan(id: string) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const errorMessage = t('error_deleting_loan')

	if (userId == null) {
		return { error: true, message: errorMessage }
	}

	const isSuccess = await deleteLoanDb({ id, userId })

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_deleting_loan') : errorMessage,
	}
}

export async function createInstallment(
	unsafeData: z.infer<typeof EntryItemSchema>,
	parentId: string
): Promise<{ error: boolean; message: string } | undefined> {
	const { userId } = await auth()
	const locale = await getLocale()
	const t = await getTranslations('server_messages')

	const { success, data } = EntryItemSchema.safeParse(unsafeData)
	const errorMessage = t('error_creating_installment')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	try {
		await createInstallmentDB({ ...data, parentId }, { userId })
	} catch {
		return {
			error: true,
			message: errorMessage,
		}
	}

	redirect(`/${locale}/dashboard/loan/${parentId}/edit?tab=${TABS.ITEMS}`)
}

export async function deleteInstallment({
	id,
	parentId,
}: {
	id: string
	parentId?: string
}) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const errorMessage = t('error_deleting_installment')

	if (userId == null || parentId == null) {
		return { error: true, message: errorMessage }
	}

	const isSuccess = await deleteInstallmentDB({
		id,
		parentId,
		userId,
	})

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_deleting_installment') : errorMessage,
	}
}

export async function updateLoanInstallments(
	parentId: string,
	unsafeData: z.infer<typeof UpdateEntryItemsSchema>
) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = UpdateEntryItemsSchema.safeParse(unsafeData)
	const errorMessage = t('error_saving_loan_installments')
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

	const installments = data.items.map(installment => ({
		...installment,
		parentId,
	}))

	const isSuccess = await updateLoanInstallmentsDB(installments, {
		parentId,
		userId,
	})

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_saving_loan_installments') : errorMessage,
	}
}

export async function moveLoanInstallments({
	oldParentId,
	unsafeData,
}: {
	oldParentId: string
	unsafeData: z.infer<typeof MoveItemsSchema>
}) {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = MoveItemsSchema.safeParse(unsafeData)

	const errorMessage = t('error_moving_installments')

	if (!success || userId == null || oldParentId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	const isSuccess = await moveLoanInstallmentsDB({
		oldParentId,
		newParentId: data.newParentId,
		installments: data.items.map(item => ({ id: item })),
		userId,
	})

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_moving_installments') : errorMessage,
	}
}
