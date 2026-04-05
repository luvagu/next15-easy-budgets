import { getGlobalTag, getIdTag, getUserTag } from '@/lib/dataCache'
import { revalidateTag } from 'next/cache'

// ─── Inventory Items ────────────────────────────────

const INVENTORY_TAG = 'inventory' as const
const CATEGORIES_TAG = 'categories' as const
const INVOICES_TAG = 'invoices' as const
const EXCHANGE_RATES_TAG = 'exchange_rates' as const

export function getInventoryGlobalTag() {
	return getGlobalTag(INVENTORY_TAG)
}

export function getUserInventoryTag(userId: string) {
	return getUserTag(INVENTORY_TAG, userId)
}

export function getInventoryItemIdTag(id: string) {
	return getIdTag(INVENTORY_TAG, id)
}

export function revalidateInventoryCache({
	id,
	userId,
}: {
	id?: string
	userId: string
}) {
	revalidateTag(getInventoryGlobalTag(), 'max')
	revalidateTag(getUserInventoryTag(userId), 'max')
	if (id) revalidateTag(getInventoryItemIdTag(id), 'max')
}

// ─── Categories ─────────────────────────────────────

export function getCategoriesGlobalTag() {
	return getGlobalTag(CATEGORIES_TAG)
}

export function getUserCategoriesTag(userId: string) {
	return getUserTag(CATEGORIES_TAG, userId)
}

export function revalidateCategoriesCache({ userId }: { userId: string }) {
	revalidateTag(getCategoriesGlobalTag(), 'max')
	revalidateTag(getUserCategoriesTag(userId), 'max')
}

// ─── Invoices ───────────────────────────────────────

export function getInvoicesGlobalTag() {
	return getGlobalTag(INVOICES_TAG)
}

export function getUserInvoicesTag(userId: string) {
	return getUserTag(INVOICES_TAG, userId)
}

export function getInvoiceIdTag(id: string) {
	return getIdTag(INVOICES_TAG, id)
}

export function revalidateInvoicesCache({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	revalidateTag(getInvoicesGlobalTag(), 'max')
	revalidateTag(getInvoiceIdTag(id), 'max')
	revalidateTag(getUserInvoicesTag(userId), 'max')
}

// ─── Exchange Rates (Global — no userId) ────────────

export function getExchangeRatesGlobalTag() {
	return getGlobalTag(EXCHANGE_RATES_TAG)
}

export function revalidateExchangeRatesCache() {
	revalidateTag(getExchangeRatesGlobalTag(), 'max')
}
