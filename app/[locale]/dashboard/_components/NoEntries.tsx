import { Button } from '@/components/ui/button'
import { NoEntryTypes } from '@/constants/types'
import { Link } from '@/i18n/navigation'
import { PlusIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function NoEntries({ type }: NoEntryTypes) {
	const common = await getTranslations('common')
	const t = await getTranslations('dashboard')

	return (
		<div className='mt-32 text-center text-balance'>
			<h1 className='text-4xl font-semibold mb-2'>
				{t('title_no_entries', {
					entries: common(`label_${type}`, { count: 0 }).toLowerCase(),
				})}
			</h1>
			<p className='mb-4'>{t(`get_started_${type}`)}</p>
			<Button size='lg' className='group' asChild>
				<Link href={`/dashboard/${type}/new`}>
					{t('label_add_entry_or_item', {
						entryOrItem: common(`label_${type}`, { count: 1 }),
					})}
					<PlusIcon className='size-4 group-hover:translate-x-1 transition-transform' />
				</Link>
			</Button>
		</div>
	)
}
