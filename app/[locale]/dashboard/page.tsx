import { getTranslations } from 'next-intl/server'
import { NoEntries } from './_components/NoEntries'
import { EntriesGrid } from './_components/EntriesGrid'
import { TabsWithHeader } from './_components/TabsWithHeader'
import { ENTRY_TYPES, TABS } from '@/constants/types'
import { getBudgets } from '@/server/db/budgets'
import { getLoans } from '@/server/db/loans'
import { auth } from '@clerk/nextjs/server'
import { TodosClient } from './_components/TodosClient'
import { getTodos } from '@/server/db/todos'

export default async function DashboardPage({
	searchParams,
}: PageProps<'/[locale]/dashboard'>) {
	const { userId, redirectToSignIn } = await auth()

	if (userId == null) {
		return redirectToSignIn()
	}

	const common = await getTranslations('common')
	const t = await getTranslations('dashboard')

	const { tab } = await searchParams
	const currentTab = Array.isArray(tab) ? tab[0] : tab || TABS.BUDGETS

	const [budgets, loans, todosLis] = await Promise.all([
		getBudgets(userId),
		getLoans(userId),
		await getTodos(userId),
	])

	const tabsWithHeaderProps = {
		title: t('dashboard_page_title'),
		defaultTab: currentTab,
		tabsList: [
			{
				value: TABS.BUDGETS,
				name: common('label_budget', { count: 0 }),
				badge: budgets.length ?? 0,
			},
			{
				value: TABS.LOANS,
				name: common('label_loan', { count: 0 }),
				badge: loans.length ?? 0,
			},
			{
				value: TABS.TODOS,
				name: common('label_todos'),
				badge: todosLis.length ?? 0,
			},
		],
		tabsContent: [
			{
				value: TABS.BUDGETS,
				content:
					budgets.length === 0 ? (
						<NoEntries type={ENTRY_TYPES.BUDGET} />
					) : (
						<EntriesGrid type={ENTRY_TYPES.BUDGET} entriesData={budgets} />
					),
			},
			{
				value: TABS.LOANS,
				content:
					loans.length === 0 ? (
						<NoEntries type={ENTRY_TYPES.LOAN} />
					) : (
						<EntriesGrid type={ENTRY_TYPES.LOAN} entriesData={loans} />
					),
			},
			{
				value: TABS.TODOS,
				content: <TodosClient todosLis={todosLis} />,
			},
		],
	}

	return (
		<div className='flex w-full flex-col gap-6'>
			<TabsWithHeader {...tabsWithHeaderProps} />
		</div>
	)
}
