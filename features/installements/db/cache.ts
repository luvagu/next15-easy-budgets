import { ENTRY_TYPES } from '@/constants/types'
import { getItemsTag, getGlobalTag, getIdTag } from '@/lib/dataCache'
import { revalidateTag } from 'next/cache'

export function getInstallmentsGlobalTag() {
	return getGlobalTag(ENTRY_TYPES.INSTALLMENTS)
}

export function getInstallmentIdTag(id: string) {
	return getIdTag(ENTRY_TYPES.INSTALLMENTS, id)
}

export function getLoanInstallmentsTag(parentId: string) {
	return getItemsTag(ENTRY_TYPES.INSTALLMENTS, parentId)
}

export function revalidateInstallmentsCache({
	id,
	parentId,
}: {
	id: string
	parentId: string
}) {
	revalidateTag(getInstallmentsGlobalTag())
	revalidateTag(getInstallmentIdTag(id))
	revalidateTag(getLoanInstallmentsTag(parentId))
}
