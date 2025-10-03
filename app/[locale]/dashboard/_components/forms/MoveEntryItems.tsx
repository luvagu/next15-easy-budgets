'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn, getItemsParentKey } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ENTRY_TYPES, MoveEntryItemsForm } from '@/constants/types'
import { getMoveItemsSchema } from '@/schemas/entries'
import {
	moveBudgetExpenses,
	moveLoanInstallments,
} from '@/server/actions/entries'

export function MoveEntryItems({
	open,
	setOpen,
	checkedItemId,
	entryItem,
	parentId,
	entries = [],
	items = [],
}: MoveEntryItemsForm) {
	const common = useTranslations('common')
	const t = useTranslations('modals')

	const [setselectAllChecked, setSetselectAllChecked] = useState(false)

	const itemText = common(`label_${entryItem}`, {
		count: 1,
	})
	const itemsText = common(`label_${entryItem}`, {
		count: 0,
	})
	const parentText = common(`label_${getItemsParentKey(entryItem)}`, {
		count: 1,
	})

	const MoveItemsSchema = getMoveItemsSchema({
		selectParentIdMessage: t('message_select_new_parent', {
			parent: parentText.toLocaleLowerCase(),
		}),
		selectItemMessage: t('message_select_item', {
			item: itemText.toLocaleLowerCase(),
		}),
	})

	const form = useForm<z.infer<typeof MoveItemsSchema>>({
		resolver: zodResolver(MoveItemsSchema),
		defaultValues: {
			newParentId: '',
			items: [],
		},
	})

	const onSubmit = async (values: z.infer<typeof MoveItemsSchema>) => {
		const action =
			entryItem === ENTRY_TYPES.EXPENSE
				? moveBudgetExpenses
				: moveLoanInstallments

		const response = await action({
			oldParentId: parentId,
			unsafeData: values,
		})

		if (!response.error) {
			toast.success(response.message)
			resetCloseDialog(false)
		}

		if (response.error) {
			toast.error(response.message)
		}
	}

	const selectAllItems = (checked: boolean) => {
		setSetselectAllChecked(checked)

		form.setValue('items', checked ? items.map(item => item.id) : [])

		if (checked) form.clearErrors('items')
	}

	const resetCloseDialog = (open: boolean) => {
		form.reset()
		setSetselectAllChecked(false)
		setOpen(open)
	}

	useEffect(() => {
		if (checkedItemId != null) {
			form.setValue('items', [checkedItemId])
		}
	}, [checkedItemId, form])

	return (
		<Dialog open={open} onOpenChange={resetCloseDialog}>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>
						{t('label_move_items', {
							items: itemsText.toLocaleLowerCase(),
						})}
					</DialogTitle>
					<DialogDescription>
						{t('description_move_items', {
							items: itemsText.toLocaleLowerCase(),
							parent: parentText.toLocaleLowerCase(),
						})}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						<FormField
							control={form.control}
							name='newParentId'
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t('label_new_parent', {
											parent: parentText,
										})}
									</FormLabel>
									<Popover>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant='outline'
													role='combobox'
													className={cn(
														'w-[200px] justify-between',
														!field.value && 'text-muted-foreground'
													)}
												>
													{field.value
														? entries.find(entry => entry.id === field.value)
																?.name
														: t('label_select_parent', {
																parent: parentText.toLowerCase(),
														  })}
													<ChevronsUpDown className='opacity-50' />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className='w-[200px] p-0'>
											<Command>
												<CommandInput
													placeholder={t('label_search_parent', {
														parent: parentText.toLowerCase(),
													})}
													className='h-9'
												/>
												<CommandList>
													<CommandEmpty>
														{t('label_parent_not_found', {
															parent: parentText.toLowerCase(),
														})}
													</CommandEmpty>
													<CommandGroup>
														{entries.map(entry => (
															<CommandItem
																value={entry.name}
																key={entry.id}
																onSelect={() => {
																	form.setValue('newParentId', entry.id)
																	form.clearErrors('newParentId')
																}}
															>
																{entry.name}
																<Check
																	className={cn(
																		'ml-auto',
																		entry.id === field.value
																			? 'opacity-100'
																			: 'opacity-0'
																	)}
																/>
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='items'
							render={() => (
								<FormItem>
									<div className='mb-4'>
										<FormLabel>{itemsText}</FormLabel>
										<FormDescription>
											{t('label_select_items', {
												items: itemsText.toLowerCase(),
												parent: parentText.toLowerCase(),
											})}
										</FormDescription>
									</div>
									<div className='flex items-center gap-2'>
										<Checkbox
											id='all'
											checked={setselectAllChecked}
											onCheckedChange={selectAllItems}
										/>
										<Label htmlFor='all'>{t('label_select_all')}</Label>
									</div>

									<Separator className='my-2' decorative />

									<div className='grid grid-cols-2 gap-2'>
										{items.map(item => (
											<FormField
												key={item.id}
												control={form.control}
												name='items'
												render={({ field }) => {
													return (
														<FormItem
															key={item.id}
															className='flex flex-row items-center gap-2'
														>
															<FormControl>
																<Checkbox
																	checked={field.value?.includes(item.id)}
																	onCheckedChange={checked => {
																		return checked
																			? field.onChange([
																					...field.value,
																					item.id,
																			  ])
																			: field.onChange(
																					field.value?.filter(
																						value => value !== item.id
																					)
																			  )
																	}}
																/>
															</FormControl>
															<FormLabel className='text-sm font-normal'>
																{item.name}
															</FormLabel>
														</FormItem>
													)
												}}
											/>
										))}
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant='outline'>{common('label_cancel')}</Button>
							</DialogClose>
							<Button type='submit' disabled={form.formState.isSubmitting}>
								{common('label_save')}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
