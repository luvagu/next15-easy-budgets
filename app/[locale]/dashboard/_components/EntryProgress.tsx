import { CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
	ENTRY_TYPES,
	FormEntryType,
	SharedEntryFields,
} from '@/constants/types'
import {
	calculateProgressValue,
	curencyFormatter,
	getProgresBgColor,
} from '@/lib/utils'
import { getLocale, getTranslations } from 'next-intl/server'

export async function EntryProgress({
	type,
	entryData,
}: {
	type: FormEntryType
	entryData: SharedEntryFields
	// t: Awaited<ReturnType<typeof getTranslations>>
	// locale: Awaited<ReturnType<typeof getLocale>>
}) {
	const t = await getTranslations('progress_card')
	const locale = await getLocale()

	const {
		totalQuota,
		totalDebt,
		expensesTotal,
		installmensTotal,
		availableQuota,
		dueAmount,
	} = entryData

	const isBudget = type === ENTRY_TYPES.BUDGET
	const isLoan = type === ENTRY_TYPES.LOAN

	// Budget amounts
	const budgetTotal = totalQuota ?? 0
	const usedBalance = expensesTotal ?? 0
	const remainingQuota = availableQuota ?? 0

	// Loan amounts
	const loanTotal = totalDebt ?? 0
	const amountPaid = installmensTotal ?? 0
	const remainingBalance = dueAmount ?? 0

	const valueA = curencyFormatter(isBudget ? budgetTotal : loanTotal, locale)
	const valueB = curencyFormatter(isBudget ? usedBalance : amountPaid, locale)
	const valueC = curencyFormatter(
		isBudget ? remainingQuota : remainingBalance,
		locale
	)

	const progressValue = calculateProgressValue(
		isBudget ? usedBalance : amountPaid,
		isBudget ? budgetTotal : loanTotal
	)

	const progressBgColor = getProgresBgColor(progressValue, isLoan)

	return (
		<CardContent className='px-5 space-y-1.5'>
			<div className='flex justify-between'>
				<span className='font-semibold'>{t(`label_${type}_value_a`)}</span>
				<span>{valueA}</span>
			</div>
			<Progress
				value={progressValue}
				className={`h-3`}
				indicatorClassName={progressBgColor}
			/>
			<div className='flex justify-between'>
				<div>
					<div className='font-semibold text-sm'>
						{t(`label_${type}_value_b`)}
					</div>
					<div>{valueB}</div>
				</div>
				<div className='text-right'>
					<div className='font-semibold text-sm'>
						{t(`label_${type}_value_c`)}
					</div>
					<div>{valueC}</div>
				</div>
			</div>
		</CardContent>
	)
}
