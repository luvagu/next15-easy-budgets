'use client'

import { Link } from '@/i18n/navigation'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import {
	BanknoteArrowDown,
	BanknoteXIcon,
	CalendarClockIcon,
	CircleCheckBigIcon,
	EllipsisIcon,
	HandCoinsIcon,
} from 'lucide-react'
import {
	calculateProgressValue,
	curencyFormatter,
	getCardClassNameBgColors,
	getDueDateStatus,
	getOverdueLoansCount,
	getPaidLoansCount,
	isLoanPaid,
} from '@/lib/utils'
import {
	BudgetsSummary,
	ENTRY_TYPES,
	FormEntryType,
	SharedEntryFields,
	GridEntriesArray,
	LoansSummary,
	TABS,
	LoanTypeTabs,
} from '@/constants/types'
import { DeleteEntryAlertDialog } from './DeleteEntryAlertDialog'
import { EntryProgress } from './EntryProgress'
import { Progress } from '@/components/ui/progress'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

export function EntriesGrid({
	type,
	entriesData,
	summary,
	selectedLoanTypeTab,
	handleSelectedLoanTypeTab,
}: {
	type: FormEntryType
	entriesData: GridEntriesArray
	summary: BudgetsSummary | LoansSummary
	selectedLoanTypeTab?: LoanTypeTabs
	handleSelectedLoanTypeTab?: (selectedTab: string) => void
}) {
	const t = useTranslations('dashboard')
	const locale = useLocale()

	const [loanType, setLoanType] = useState<LoanTypeTabs>(
		selectedLoanTypeTab ?? TABS.FOR,
	)

	const handleLoanTypeChange = (selectedTab: string) => {
		setLoanType(selectedTab as LoanTypeTabs)
		if (handleSelectedLoanTypeTab) handleSelectedLoanTypeTab(selectedTab)
	}

	const isLoan = type === ENTRY_TYPES.LOAN

	const budgetsSummary = !isLoan ? (summary as BudgetsSummary) : null
	const loansSummary = isLoan ? (summary as LoansSummary) : null

	const filteredEntries = isLoan
		? loanType === TABS.AGAINST
			? entriesData.filter(entry => entry.isAgainst)
			: entriesData.filter(entry => !entry.isAgainst)
		: entriesData

	const loansForCount = (
		isLoan ? entriesData.filter(entry => !entry.isAgainst) : []
	).length
	const loansAgainstCount = (
		isLoan ? entriesData.filter(entry => entry.isAgainst) : []
	).length

	const overdueLoansCount = isLoan ? getOverdueLoansCount(filteredEntries) : 0
	const paidLoansCount = isLoan ? getPaidLoansCount(filteredEntries) : 0

	const progressValue = calculateProgressValue(
		isLoan
			? (loansSummary?.[loanType]?.grandLoansInstallemtsTotal ?? 0)
			: (budgetsSummary?.grandBudgetsExpensesTotal ?? 0),
		isLoan
			? (loansSummary?.[loanType]?.grandLoansTotalDebt ?? 0)
			: (budgetsSummary?.grandBudgetsTotalQuota ?? 0),
	)

	return (
		<div className='flex flex-col gap-4'>
			{isLoan ? (
				<Tabs defaultValue={loanType} onValueChange={handleLoanTypeChange}>
					<Card className='relative overflow-hidden py-4 px-5 shadow-none rounded-md'>
						<TabsList className='absolute right-0 -top-[1px] p-0 border shadow-none rounded-md rounded-tl-none rounded-br-none border-t-0 border-r-0 overflow-hidden flex-col sm:flex-row h-auto sm:h-9 *:w-full sm:*:w-fit *:shadow-none *:px-3 *:rounded-none *:data-[state=inactive]:inset-shadow-sm *:text-xs sm:*:text-sm'>
							<TabsTrigger value={TABS.FOR}>
								<HandCoinsIcon />
								{t('label_loan_tab_for')}
								<Badge
									variant={'outline'}
									className='h-5 min-w-5 rounded-full px-1 font-mono tabular-nums'
								>
									{loansForCount}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value={TABS.AGAINST}>
								<BanknoteArrowDown />
								{t('label_loan_tab_against')}
								<Badge
									variant={'outline'}
									className='h-5 min-w-5 rounded-full px-1 font-mono tabular-nums'
								>
									{loansAgainstCount}
								</Badge>
							</TabsTrigger>
						</TabsList>
						<TabsContent value={loanType} className='space-y-4'>
							<CardHeader className='p-0'>
								<CardDescription>{t('label_loan_grand_total')}</CardDescription>
								<CardTitle className='text-lg font-semibold tabular-nums sm:text-xl'>
									{curencyFormatter(
										loansSummary?.[loanType].grandLoansTotalDebt as number,
										locale,
									)}
								</CardTitle>
								{(overdueLoansCount || paidLoansCount) && (
									<div className='flex items-center gap-2'>
										{overdueLoansCount > 0 && (
											<Badge
												variant='destructive'
												className='text-[10px] px-1.5 py-0'
											>
												<BanknoteXIcon className='h-3 w-3' />
												{t('label_loans_overdue', {
													count: overdueLoansCount,
												})}
											</Badge>
										)}
										{paidLoansCount > 0 && (
											<Badge
												variant='outline'
												className='text-[10px] px-1.5 py-0 border-green-600 text-green-600'
											>
												<CircleCheckBigIcon className='h-3 w-3' />
												{t('label_loans_paid', {
													count: paidLoansCount,
												})}
											</Badge>
										)}
									</div>
								)}
							</CardHeader>
							<CardContent className='p-0 space-y-4'>
								<div className='grid grid-cols-2 gap-4'>
									<div className='flex items-center gap-2 text-sm'>
										<span className='text-sm'>
											{t('label_loan_total_paid')}
										</span>
										<div className='bg-muted rounded-md px-2 py-1 text-center text-sm'>
											{curencyFormatter(
												loansSummary?.[loanType]
													.grandLoansInstallemtsTotal as number,
												locale,
											)}
										</div>
									</div>
									<div className='flex items-center justify-end gap-2 text-sm'>
										<span className='text-sm'>{t('label_loan_total_due')}</span>
										<div className='bg-muted rounded-md px-2 py-1 text-center text-sm'>
											{curencyFormatter(
												loansSummary?.[loanType]
													.grandLoansDueAmoutTotal as number,
												locale,
											)}
										</div>
									</div>
								</div>
								<Progress
									value={progressValue}
									className={`h-3`}
									indicatorClassName='bg-lime-400'
								/>
							</CardContent>
						</TabsContent>
					</Card>
				</Tabs>
			) : (
				<Card className='py-4 px-5 gap-4 shadow-none rounded-md'>
					<CardHeader className='p-0'>
						<CardDescription>
							{t(
								isLoan ? 'label_loan_grand_total' : 'label_budget_grand_total',
							)}
						</CardDescription>
						<CardTitle className='text-lg font-semibold tabular-nums sm:text-xl'>
							{curencyFormatter(
								(isLoan
									? loansSummary?.for.grandLoansTotalDebt
									: budgetsSummary?.grandBudgetsTotalQuota) as number,
								locale,
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className='p-0 space-y-4'>
						<div className='grid grid-cols-2 gap-4'>
							<div className='flex items-center gap-2 text-sm'>
								<span className='text-sm'>
									{t(
										isLoan
											? 'label_loan_total_paid'
											: 'label_budget_total_available',
									)}
								</span>
								<div className='bg-muted rounded-md px-2 py-1 text-center text-sm'>
									{curencyFormatter(
										(isLoan
											? loansSummary?.for.grandLoansInstallemtsTotal
											: budgetsSummary?.grandBudgetsExpensesTotal) as number,
										locale,
									)}
								</div>
							</div>
							<div className='flex items-center justify-end gap-2 text-sm'>
								<span className='text-sm'>
									{t(
										isLoan ? 'label_loan_total_due' : 'label_budget_total_used',
									)}
								</span>
								<div className='bg-muted rounded-md px-2 py-1 text-center text-sm'>
									{curencyFormatter(
										(isLoan
											? loansSummary?.for.grandLoansDueAmoutTotal
											: budgetsSummary?.grandBudgetsAvailableQuota) as number,
										locale,
									)}
								</div>
							</div>
						</div>
						<Progress
							value={progressValue}
							className={`h-3`}
							indicatorClassName='bg-lime-400'
						/>
					</CardContent>
				</Card>
			)}

			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
				{filteredEntries.map(entry => (
					<EntryCard key={entry.id} type={type} entryData={entry} />
				))}
			</div>
		</div>
	)
}

function EntryCard({
	type,
	entryData,
}: {
	type: FormEntryType
	entryData: SharedEntryFields
}) {
	const common = useTranslations('common')
	const t = useTranslations('dashboard')
	const format = useFormatter()

	const { id, name, bgColor, dueDate } = entryData

	const isLoan = type === ENTRY_TYPES.LOAN
	const item = isLoan ? ENTRY_TYPES.INSTALLMENT : ENTRY_TYPES.EXPENSE
	const isPaid = isLoan && isLoanPaid(entryData)

	const { isOverdue, isDueToday } = getDueDateStatus(dueDate)

	return (
		<Card
			className={`${getCardClassNameBgColors(bgColor)} py-4 gap-3 shadow-none rounded-md`}
		>
			<CardHeader className='px-5'>
				<div className='flex gap-2 justify-between items-center'>
					<CardTitle>
						<Link href={`/dashboard/${type}/${id}/edit`}>{name}</Link>
					</CardTitle>
					<AlertDialog>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' className='size-8 p-0'>
									<div className='sr-only'>Action Menu</div>
									<EllipsisIcon className='size-4' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem>
									<Link
										href={`/dashboard/${type}/${id}/edit`}
										className='inline-flex w-full h-full'
									>
										{t('label_edit')}
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Link
										href={`/dashboard/${type}/${id}/edit?tab=${TABS.ITEMS}`}
										className='inline-flex w-full h-full'
									>
										{t('label_view_items', {
											items: common(`label_${item}`, {
												count: 0,
											}),
										})}
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Link
										href={`/dashboard/${type}/${id}/${item}/new`}
										className='inline-flex w-full h-full'
									>
										{t('label_add_entry_or_item', {
											entryOrItem: common(`label_${item}`, {
												count: 1,
											}),
										})}
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<AlertDialogTrigger asChild>
									<DropdownMenuItem variant='destructive'>
										{t('label_delete')}
									</DropdownMenuItem>
								</AlertDialogTrigger>
							</DropdownMenuContent>
						</DropdownMenu>
						<DeleteEntryAlertDialog type={type} id={id} />
					</AlertDialog>
				</div>
				{isLoan && isPaid ? (
					<CardDescription className='flex items-center gap-1.5'>
						<Badge
							variant='outline'
							className='text-[10px] px-1.5 py-0 border-green-600 text-green-600'
						>
							<CircleCheckBigIcon className='h-3 w-3' />
							{t('label_loan_paid')}
						</Badge>
					</CardDescription>
				) : isLoan && dueDate ? (
					<CardDescription
						className={`flex items-center gap-1.5 ${
							isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : ''
						}`}
					>
						<CalendarClockIcon className='h-4 w-4' />
						<span>
							{t('label_loan_due_date', {
								date: format.dateTime(new Date(dueDate), {
									year: 'numeric',
									month: 'short',
									day: 'numeric',
								}),
							})}
						</span>
						{isOverdue && (
							<Badge variant='destructive' className='text-[10px] px-1.5 py-0'>
								{t('label_loan_overdue')}
							</Badge>
						)}
					</CardDescription>
				) : null}
			</CardHeader>
			<EntryProgress type={type} entryData={entryData} />
		</Card>
	)
}
