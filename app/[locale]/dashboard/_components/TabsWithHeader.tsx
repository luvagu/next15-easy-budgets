'use client'

import { Fragment, ReactNode, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { PlusIcon } from 'lucide-react'
import { ENTRY_TYPES } from '@/constants/types'
import { Badge } from '@/components/ui/badge'

export function TabsWithHeader({
	title,
	defaultTab,
	tabsList,
	tabsContent,
}: {
	title: string
	defaultTab: string
	tabsList: {
		value: string
		name: string
		badge: number
	}[]
	tabsContent: {
		value: string
		content: ReactNode
	}[]
}) {
	const common = useTranslations('common')
	const t = useTranslations('dashboard')
	const [selectedTab, setSetselectedTab] = useState(defaultTab)

	const entry =
		selectedTab === ENTRY_TYPES.BUDGETS ? ENTRY_TYPES.BUDGET : ENTRY_TYPES.LOAN

	return (
		<>
			<h1 className='text-2xl sm:text-3xl font-semibold flex items-center justify-between'>
				<span>{title}</span>
				<Button className='group' size={'sm'} asChild>
					<Link href={`/dashboard/${entry}/new`}>
						<span>
							{t('label_add_entry_or_item', {
								entryOrItem: common(`label_${entry}`, { count: 1 }),
							})}
						</span>
						<PlusIcon className='size-4 group-hover:translate-x-1 transition-transform' />
					</Link>
				</Button>
			</h1>
			<Tabs
				defaultValue={selectedTab}
				onValueChange={selectedTab => setSetselectedTab(selectedTab)}
			>
				<TabsList>
					{tabsList.map(tab => (
						<Fragment key={tab.value}>
							<TabsTrigger value={tab.value}>
								{tab.name}
								<Badge
									variant={'outline'}
									className='h-5 min-w-5 rounded-full px-1 font-mono tabular-nums'
								>
									{tab.badge}
								</Badge>
							</TabsTrigger>
						</Fragment>
					))}
				</TabsList>
				{tabsContent.map(tab => (
					<TabsContent key={tab.value} value={tab.value}>
						{tab.content}
					</TabsContent>
				))}
			</Tabs>
		</>
	)
}
