'use server'

import {
	getLoanEntrySchema,
	getEntryItemSchema,
	getEntryItemsSchema,
	getMoveItemsSchema,
} from '@/schemas/entries'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import {
	createLoan as createLoanDB,
	deleteLoan as deleteLoanDb,
	updateLoan as updateLoanDB,
	createInstallment as createInstallmentDB,
	deleteInstallment as deleteInstallmentDB,
	updateLoanInstallments as updateLoanInstallmentsDB,
	moveLoanInstallments as moveLoanInstallmentsDB,
} from '@/features/loans/db/loans'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TABS } from '@/constants/types'

const LoanEntrySchema = getLoanEntrySchema()
const EntryItemSchema = getEntryItemSchema()
const UpdateEntryItemsSchema = getEntryItemsSchema()
const MoveItemsSchema = getMoveItemsSchema({})

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
			dueAmount: data.totalDebt,
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
