'use server'

import { getEntryItemSchema, getEntryItemsSchema } from '@/schemas/entries'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TABS } from '@/constants/types'
import {
	createInstallment as createInstallmentDB,
	deleteInstallment as deleteInstallmentDB,
	updateLoanInstallments as updateLoanInstallmentsDB,
} from '@/features/installements/db/installements'

const EntryItemSchema = getEntryItemSchema()
const UpdateEntryItemsSchema = getEntryItemsSchema()

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
