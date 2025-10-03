'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ENTRY_TYPES, UpdateEntryItem } from '@/constants/types'
import { getEntryItemsSchema } from '@/schemas/entries'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useFormatter } from 'next-intl'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { useState } from 'react'
import { DeleteEntryAlertDialog } from '../DeleteEntryAlertDialog'
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
	updateBudgetExpenses,
	updateLoanInstallments,
} from '@/server/actions/entries'
import { Checkbox } from '@/components/ui/checkbox'
import { MoveEntryItems } from './MoveEntryItems'

export function EntryItemsListForm({
	entryItem,
	parentId,
	items,
	entries,
}: UpdateEntryItem) {
	const t = useTranslations('forms')
	const message = t('required')
	const EntryItemsSchema = getEntryItemsSchema(message)

	const [deleteItemId, setDeleteItemId] = useState('')
	const [checkedItemId, setCheckedItemId] = useState<string>('')
	const [isOpen, setIsOpen] = useState(false)

	const form = useForm<z.infer<typeof EntryItemsSchema>>({
		resolver: zodResolver(EntryItemsSchema),
		defaultValues: {
			items: items.map(item => {
				return {
					id: item.id,
					name: item.name ?? '',
					amount: item.amount ?? 0,
				}
			}),
		},
	})

	const onSubmit = async (values: z.infer<typeof EntryItemsSchema>) => {
		const isBudgetExpenses = entryItem === ENTRY_TYPES.EXPENSE
		const action = isBudgetExpenses
			? updateBudgetExpenses
			: updateLoanInstallments

		const data = await action(parentId, values)

		if (data.error) {
			toast.error(data.message)
		} else {
			toast.success(data.message)
		}
	}

	const format = useFormatter()

	const setModalOpen = (isOpen: boolean) => {
		setIsOpen(isOpen)

		if (!isOpen) {
			setCheckedItemId('')
		}
	}

	return (
		<Form {...form}>
			<AlertDialog>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='flex gap-4 flex-col'
				>
					{items.map((item, index) => {
						const dateTime = new Date(item.createdAt)

						const formattedDate = format.dateTime(dateTime, {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: 'numeric',
						})

						return (
							<Card key={item.id} className='relative gap-2 pt-3.5 pb-4'>
								<CardHeader className='px-4'>
									<Badge variant='outline'>{formattedDate}</Badge>
								</CardHeader>
								<CardContent className='flex flex-col sm:flex-row gap-4 px-4'>
									<Input
										type='hidden'
										{...form.register(`items.${index}.id`)}
									/>
									<FormField
										control={form.control}
										name={`items.${index}.name`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t('label_name')}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name={`items.${index}.amount`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t(`label_${entryItem}_amount`)}</FormLabel>
												<FormControl>
													<Input
														type='number'
														{...field}
														step='any'
														min={0}
														onChange={e =>
															field.onChange(
																isNaN(e.target.valueAsNumber)
																	? ''
																	: e.target.valueAsNumber
															)
														}
														// {...form.register(`items.${index}.amount`, {
														// 	valueAsNumber: true,
														// })}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<AlertDialogTrigger asChild>
										<Button
											variant='outline'
											type='button'
											className='sm:self-baseline-last'
											onClick={() => setDeleteItemId(item.id)}
										>
											<span className='text-destructive'>
												{t('label_delete')}
											</span>
										</Button>
									</AlertDialogTrigger>
								</CardContent>
								<Checkbox
									className='absolute right-4 top-4 shadow'
									checked={checkedItemId === item.id}
									onCheckedChange={checked => {
										if (checked) {
											setCheckedItemId(item.id)
											setIsOpen(true)
										}
									}}
								/>
							</Card>
						)
					})}
					<div className='self-end'>
						<Button disabled={form.formState.isSubmitting} type='submit'>
							{t('label_save')}
						</Button>
					</div>
				</form>
				<DeleteEntryAlertDialog
					type={entryItem}
					id={deleteItemId}
					parentId={parentId}
				/>
			</AlertDialog>
			<MoveEntryItems
				open={isOpen}
				setOpen={setModalOpen}
				checkedItemId={checkedItemId}
				entryItem={entryItem}
				parentId={parentId}
				entries={entries}
				items={items}
			/>
		</Form>
	)
}
