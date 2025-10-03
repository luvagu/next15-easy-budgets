'use server'

import { getLoanEntrySchema } from '@/schemas/entries'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import {
	createLoan as createLoanDB,
	deleteLoan as deleteLoanDb,
	updateLoan as updateLoanDB,
} from '@/features/loans/db/loans'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { TABS } from '@/constants/types'

const LoanEntrySchema = getLoanEntrySchema()

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
