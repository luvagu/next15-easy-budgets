import { Link } from '@/i18n/navigation'
import {
	Card,
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
import { BanknoteArrowDown, EllipsisIcon, HandCoinsIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getCardClassNameBgColors } from '@/lib/utils'
import {
	ENTRY_TYPES,
	FormEntryType,
	SharedEntryFields,
	GridEntriesArray,
	TABS,
} from '@/constants/types'
import { DeleteEntryAlertDialog } from './DeleteEntryAlertDialog'
import { EntryProgress } from './EntryProgress'

export function EntriesGrid({
	type,
	entriesData,
}: {
	type: FormEntryType
	entriesData: GridEntriesArray
}) {
	return (
		<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
			{entriesData.map(entry => (
				<EntryCard key={entry.id} type={type} entryData={entry} />
			))}
		</div>
	)
}

async function EntryCard({
	type,
	entryData,
}: {
	type: FormEntryType
	entryData: SharedEntryFields
}) {
	const common = await getTranslations('common')
	const t = await getTranslations('dashboard')

	const { id, name, bgColor, isAgainst } = entryData

	const isLoan = type === ENTRY_TYPES.LOAN
	const item = isLoan ? ENTRY_TYPES.INSTALLMENT : ENTRY_TYPES.EXPENSE

	return (
		<Card className={`${getCardClassNameBgColors(bgColor)} py-4 gap-3`}>
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
				{isLoan && (
					<CardDescription className='flex items-center gap-1.5'>
						{isAgainst ? (
							<>
								<span className='text-sky-700'>
									{t(`label_loan_is_against_true`)}
								</span>
								<BanknoteArrowDown className='h-4 w-4' />
							</>
						) : (
							<>
								<span className='text-green-700'>
									{t(`label_loan_is_against_false`)}
								</span>
								<HandCoinsIcon className='h-4 w-4' />
							</>
						)}
					</CardDescription>
				)}
			</CardHeader>
			<EntryProgress type={type} entryData={entryData} />
		</Card>
	)
}
