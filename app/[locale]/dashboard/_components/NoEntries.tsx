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
import { getTranslations } from 'next-intl/server'

export async function NoEntries({ type }: NoEntryTypes) {
	const common = await getTranslations('common')
	const t = await getTranslations('dashboard')

	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant='icon'>
					<FolderPlusIcon />
				</EmptyMedia>
				<EmptyTitle>
					{t('title_no_entries', {
						entries: common(`label_${type}`, { count: 0 }).toLowerCase(),
					})}
				</EmptyTitle>
				<EmptyDescription>{t(`get_started_${type}`)}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button size='lg' className='group' asChild>
					<Link href={`/dashboard/${type}/new`}>
						{t('label_add_entry_or_item', {
							entryOrItem: common(`label_${type}`, { count: 1 }),
						})}
						<PlusIcon className='size-4 group-hover:translate-x-1 transition-transform' />
					</Link>
				</Button>
			</EmptyContent>
		</Empty>
	)
}
