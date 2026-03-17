'use client'

import { useTranslations } from 'next-intl'
import { NoEntries } from './NoEntries'
import { EntriesGrid } from './EntriesGrid'
import { TodosClient } from './TodosClient'
import { TabsWithHeader } from './TabsWithHeader'
import { useSearchParams } from 'next/navigation'
import {
	DashboardPageProps,
	DashboardTabs,
	ENTRY_TYPES,
	LoanTypeTabs,
	TABS,
	UserSettings,
} from '@/constants/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { getBudgetsSummary, getLoansSummary } from '@/lib/utils'

export function DashboardPageClient({
	budgets,
	loans,
	todosLis,
}: DashboardPageProps) {
	const commonT = useTranslations('common')
	const dashboardT = useTranslations('dashboard')
	const [settings, setSettings, , isHydrated] = useLocalStorage<UserSettings>(
		'userSettings',
		{
			selectedDashboadTab: TABS.BUDGETS,
			selectedLoanTypeTab: TABS.FOR,
		},
	)

	const params = useSearchParams()
	const currentTab = params.get('tab') ?? settings.selectedDashboadTab

	const handleSelectedDashboadTab = (selectedTab: string) =>
		setSettings(prevSettings => ({
			...prevSettings,
			selectedDashboadTab: selectedTab as DashboardTabs,
		}))

	const handleSelectedLoanTypeTab = (selectedTab: string) =>
		setSettings(prevSettings => ({
			...prevSettings,
			selectedLoanTypeTab: selectedTab as LoanTypeTabs,
		}))

	const tabsWithHeaderProps = {
		title: dashboardT('dashboard_page_title'),
		defaultTab: currentTab,
		tabsList: [
			{
				value: TABS.BUDGETS,
				name: commonT('label_budget', { count: 0 }),
				badge: budgets.length ?? 0,
			},
			{
				value: TABS.LOANS,
				name: commonT('label_loan', { count: 0 }),
				badge: loans.length ?? 0,
			},
			{
				value: TABS.TODOS,
				name: commonT('label_todos'),
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
						<EntriesGrid
							type={ENTRY_TYPES.BUDGET}
							entriesData={budgets}
							summary={getBudgetsSummary(budgets)}
						/>
					),
			},
			{
				value: TABS.LOANS,
				content:
					loans.length === 0 ? (
						<NoEntries type={ENTRY_TYPES.LOAN} />
					) : (
						<EntriesGrid
							type={ENTRY_TYPES.LOAN}
							entriesData={loans}
							summary={getLoansSummary(loans)}
							selectedLoanTypeTab={settings.selectedLoanTypeTab}
							handleSelectedLoanTypeTab={handleSelectedLoanTypeTab}
						/>
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
			{isHydrated && (
				<TabsWithHeader
					{...tabsWithHeaderProps}
					handleSelectedDashboadTab={handleSelectedDashboadTab}
				/>
			)}
		</div>
	)
}
