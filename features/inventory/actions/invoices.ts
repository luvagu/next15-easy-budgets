'use server'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { getSaleInvoiceSchema } from '../schemas/inventory'
import {
	registerSale as registerSaleDB,
	cancelSale as cancelSaleDB,
	processReturn as processReturnDB,
	getInvoicesByUser,
} from '../db/invoices'

const SaleSchema = getSaleInvoiceSchema()

export async function registerSale(
	unsafeData: z.infer<typeof SaleSchema>
): Promise<{ error: boolean; message: string; reason?: string }> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	const { success, data } = SaleSchema.safeParse(unsafeData)
	if (!success) {
		return { error: true, message: t('error_generic') }
	}

	try {
		await registerSaleDB({
			userId,
			customerName: data.customerName,
			deliveryChargeUsd: data.deliveryChargeUsd,
			discountType: data.discountType,
			discountValue: data.discountValue,
			isCreditSale: data.isCreditSale,
			paymentDueDate: data.paymentDueDate ?? new Date(Date.now() + 86_400_000),
			items: data.items,
		})

		return { error: false, message: t('success_generic') }
	} catch (err) {
		return {
			error: true,
			message: t('error_generic'),
			reason: (err as Error).message,
		}
	}
}

export async function cancelSale(
	invoiceId: string
): Promise<{ error: boolean; message: string }> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		await cancelSaleDB({ invoiceId, userId })
		return { error: false, message: t('success_generic') }
	} catch (err) {
		return {
			error: true,
			message: (err as Error).message ?? t('error_generic'),
		}
	}
}

export async function processReturn(
	invoiceId: string,
	items: { lineItemId: string; qtyToReturn: number }[]
): Promise<{ error: boolean; message: string; newStatus?: string }> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const { newStatus } = await processReturnDB({ invoiceId, userId, items })
		return { error: false, message: t('success_generic'), newStatus }
	} catch (err) {
		return {
			error: true,
			message: (err as Error).message ?? t('error_generic'),
		}
	}
}

export async function getSalesHistory(
	{ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<{ error: boolean; data?: Awaited<ReturnType<typeof getInvoicesByUser>>; message?: string }> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	if (userId == null) {
		return { error: true, message: t('error_unauthorized') }
	}

	try {
		const data = await getInvoicesByUser(userId, { limit, offset })
		return { error: false, data }
	} catch {
		return { error: true, message: t('error_generic') }
	}
}
