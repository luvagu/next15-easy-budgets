'use client'

import { Button } from '@/components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { NoEntryTypes } from '@/constants/types'
import { Link } from '@/i18n/navigation'
import { FolderPlusIcon, PlusIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function NoEntries({ type }: NoEntryTypes) {
	const commonT = useTranslations('common')
	const dashboardT = useTranslations('dashboard')

	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant='icon'>
					<FolderPlusIcon />
				</EmptyMedia>
				<EmptyTitle>
					{dashboardT('title_no_entries', {
						entries: commonT(`label_${type}`, { count: 0 }).toLowerCase(),
					})}
				</EmptyTitle>
				<EmptyDescription>{dashboardT(`get_started_${type}`)}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button size='lg' className='group' asChild>
					<Link href={`/dashboard/${type}/new`}>
						{dashboardT('label_add_entry_or_item', {
							entryOrItem: commonT(`label_${type}`, { count: 1 }),
						})}
						<PlusIcon className='size-4 group-hover:translate-x-1 transition-transform' />
					</Link>
				</Button>
			</EmptyContent>
		</Empty>
	)
}
