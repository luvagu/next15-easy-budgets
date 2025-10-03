'use client'

import {
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DeleteEntry, ENTRY_TYPES } from '@/constants/types'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
	deleteBudget,
	deleteExpense,
	deleteInstallment,
	deleteLoan,
} from '@/server/actions/entries'

export function DeleteEntryAlertDialog({
	type,
	id,
	parentId,
}: {
	type: DeleteEntry
	id: string
	parentId?: string
}) {
	const t = useTranslations('alert_dialogs')
	const [isDeletePending, startDeleteTransition] = useTransition()

	const isExpenseOrInstallment =
		type === ENTRY_TYPES.EXPENSE || type === ENTRY_TYPES.INSTALLMENT
	const entryItemsLabel =
		type === ENTRY_TYPES.BUDGET ? ENTRY_TYPES.EXPENSE : ENTRY_TYPES.INSTALLMENT

	const descriptionText = isExpenseOrInstallment
		? t('alert_delete_description_item', {
				type: t(`label_${type}`, { count: 1 }),
		  })
		: t('alert_delete_description_entry', {
				type: t(`label_${type}`),
				items: t(`label_${entryItemsLabel}`, { count: 2 }),
		  })

	const onDelete = () => {
		startDeleteTransition(async () => {
			let action

			switch (type) {
				case ENTRY_TYPES.BUDGET:
					action = deleteBudget.bind(null, id)
					break
				case ENTRY_TYPES.LOAN:
					action = deleteLoan.bind(null, id)
					break
				case ENTRY_TYPES.EXPENSE:
					action = deleteExpense.bind(null, { id, parentId })
					break
				case ENTRY_TYPES.INSTALLMENT:
					action = deleteInstallment.bind(null, { id, parentId })
					break
				default:
					break
			}

			const response = action && (await action())

			if (response && !response.error) {
				toast.success(response.message)
			}

			if (response && response.error) {
				toast.error(response.message)
			}
		})
	}

	return (
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>{t('alert_delete_title')}</AlertDialogTitle>
				<AlertDialogDescription>{descriptionText}</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel>{t('alert_delete_cancel')}</AlertDialogCancel>
				<AlertDialogAction
					onClick={onDelete}
					disabled={isDeletePending}
					className='bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60'
				>
					{t('alert_delete_delete')}
				</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	)
}
