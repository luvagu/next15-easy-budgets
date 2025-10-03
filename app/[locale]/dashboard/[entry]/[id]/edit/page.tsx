import { PageWithBackButton } from '../../../_components/PageWithBackButton'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import {
	ENTRY_TYPES,
	FormEntryType,
	EntryTabs,
	TABS,
	FormItemType,
	BudgetEntryDetails,
	LoanEntryDetails,
} from '@/constants/types'
import { LoanEntryForm } from '../../../_components/forms/LoanEntryForm'
import { BudgetEntryForm } from '../../../_components/forms/BudgetEntryForm'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntryItemsListForm } from '../../../_components/forms/EntryItemsListForm'
import { EntryProgress } from '../../../_components/EntryProgress'
import { getCardClassNameBgColors } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { MessageSquareWarningIcon, PlusIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getBudget, getBudgets } from '@/server/db/budgets'
import { getLoan, getLoans } from '@/server/db/loans'

export default async function EditEntryPage({
	params,
	searchParams,
}: {
	params: Promise<{ entry: FormEntryType; id: string }>
	searchParams: Promise<{ tab: EntryTabs }>
}) {
	const { userId, redirectToSignIn } = await auth()

	if (userId == null) {
		return redirectToSignIn()
	}

	const { entry, id } = await params
	const { tab = TABS.DETAILS } = await searchParams
	const t = await getTranslations('forms')

	const isBudget = entry === ENTRY_TYPES.BUDGET
	const isLoan = entry === ENTRY_TYPES.LOAN
	const entryItem: FormItemType = isBudget
		? ENTRY_TYPES.EXPENSE
		: ENTRY_TYPES.INSTALLMENT

	const budgetData = isBudget ? await getBudget({ id, userId }) : undefined
	const loanData = isLoan ? await getLoan({ id, userId }) : undefined

	const entryData = budgetData || loanData

	const budgets = isBudget ? await getBudgets(userId) : undefined
	const loans = isLoan ? await getLoans(userId) : undefined

	const entries = (budgets || loans || []).filter(entry => entry.id !== id)

	const returnTap = isBudget ? ENTRY_TYPES.BUDGETS : ENTRY_TYPES.LOANS

	// loaclization texts
	const parentPageName = t(`form_edit_${entry}_title`)
	const childPageName = entryData?.name
	const formDetailsTitle = t(`form_${entry}_details_title`)
	const formDetailsDescription = t(`form_${entry}_description`)
	const entryItemsTitle = t(`${entry}_items_title`)
	const entryItemsDescription = t(`${entry}_items_description`)
	const entryItemsEmptyListText = t(`no_${entryItem}_items`)

	return (
		<PageWithBackButton
			backButtonHref={`/dashboard?tab=${returnTap}`}
			parentPageName={parentPageName}
			childPageName={childPageName}
		>
			<Tabs defaultValue={tab} className='gap-4'>
				<TabsList className='flex items-center justify-between w-full'>
					<div>
						<TabsTrigger value={TABS.DETAILS}>{t('tab_details')}</TabsTrigger>
						<TabsTrigger value={TABS.ITEMS}>
							{t(`tab_${entry}_items`)}
						</TabsTrigger>
					</div>
					<Button
						size={'sm'}
						className='group px-2 py-1 h-7 text-sm font-medium'
						asChild
					>
						<Link href={`/dashboard/${entry}/${id}/${entryItem}/new`}>
							{t(`label_add_${entry}_item`)}
							<PlusIcon className='size-4 group-hover:translate-x-1 transition-transform' />
						</Link>
					</Button>
				</TabsList>
				{entryData && (
					<Card
						className={`${getCardClassNameBgColors(
							entryData.bgColor
						)} py-5 gap-3`}
					>
						<EntryProgress type={entry} entryData={entryData} />
					</Card>
				)}
				<TabsContent value={TABS.DETAILS}>
					<EntryDetails
						title={formDetailsTitle}
						description={formDetailsDescription}
						budgetData={budgetData}
						loanData={loanData}
					/>
				</TabsContent>
				<TabsContent value={TABS.ITEMS}>
					<EntryItemsList
						parentId={id}
						entryItem={entryItem}
						title={entryItemsTitle}
						description={entryItemsDescription}
						entryItemsEmptyListText={entryItemsEmptyListText}
						items={budgetData?.budgetExpenses || loanData?.loanInstallments}
						entries={entries}
					/>
				</TabsContent>
			</Tabs>
		</PageWithBackButton>
	)
}

async function EntryDetails({
	title,
	description,
	budgetData,
	loanData,
}: {
	title: string
	description: string
	budgetData: BudgetEntryDetails | undefined
	loanData: LoanEntryDetails | undefined
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-xl'>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{budgetData && <BudgetEntryForm budget={budgetData} />}
				{loanData && <LoanEntryForm loan={loanData} />}
			</CardContent>
		</Card>
	)
}

async function EntryItemsList({
	parentId,
	entryItem,
	title,
	description,
	entryItemsEmptyListText,
	items,
	entries,
}: {
	parentId: string
	entryItem: FormItemType
	title: string
	description: string
	entryItemsEmptyListText: string
	items?: {
		id: string
		name: string
		createdAt: Date
		parentId: string
		amount: number
	}[]
	entries?: {
		id: string
		name: string
	}[]
}) {
	const isEntryItemsListEmpty = (items?.length ?? 0) === 0

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-xl'>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{isEntryItemsListEmpty && (
					<Alert>
						<MessageSquareWarningIcon />
						<AlertDescription>{entryItemsEmptyListText}</AlertDescription>
					</Alert>
				)}
				{!isEntryItemsListEmpty && items && (
					<EntryItemsListForm
						entryItem={entryItem}
						parentId={parentId}
						items={items}
						entries={entries}
					/>
				)}
			</CardContent>
		</Card>
	)
}
