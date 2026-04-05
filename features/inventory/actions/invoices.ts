'use server'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { getSaleInvoiceSchema } from '../schemas/inventory'
import { registerSale as registerSaleDB } from '../db/invoices'

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
