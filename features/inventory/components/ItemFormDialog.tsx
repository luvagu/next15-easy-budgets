'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getInventoryItemSchema } from '../schemas/inventory'
import { addOrUpdateItem } from '../actions/items'
import { CreatableCombobox } from './CreatableCombobox'
import type { InventoryItemWithCategory } from '../types/inventory'

type ItemFormValues = z.infer<ReturnType<typeof getInventoryItemSchema>>

interface ItemFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	editItem?: InventoryItemWithCategory | null
	categoryNames: string[]
	brandNames: string[]
	onSuccess: () => void
}

export function ItemFormDialog({
	open,
	onOpenChange,
	editItem,
	categoryNames,
	brandNames,
	onSuccess,
}: ItemFormDialogProps) {
	const t = useTranslations('inventory')
	const tForms = useTranslations('forms')
	const ItemSchema = getInventoryItemSchema({
		required: tForms('required'),
		comboFieldsTogether: t('error_combo_fields_together'),
		comboPriceBelowCost: t('error_combo_price_below_cost'),
		comboPriceAboveSale: t('error_combo_price_above_sale'),
	})
	const [isPending, startTransition] = useTransition()
	const isEdit = !!editItem
	const [comboPriceMode, setComboPriceMode] = useState<'usd' | 'pct'>('usd')
	const [comboPctInput, setComboPctInput] = useState('')

	const form = useForm<ItemFormValues>({
		resolver: zodResolver(ItemSchema),
		defaultValues: {
			name: '',
			brand: '',
			unit: '',
			baseCostUsd: 0,
			profitMarginPct: 30,
			baseSalePriceUsd: 0,
			categoryName: '',
			initialStock: 0,
			comboQtyThreshold: undefined,
			comboPriceUsd: undefined,
		},
	})

	// Resets combo UI state and closes the dialog
	const handleOpenChange = (v: boolean) => {
		if (!v) {
			setComboPriceMode('usd')
			setComboPctInput('')
		}
		onOpenChange(v)
	}

	// Reset form with fresh data every time dialog opens
	useEffect(() => {
		if (open) {
			form.reset(
				editItem
					? {
							name: editItem.name,
							brand: editItem.brand ?? '',
							unit: editItem.unit,
							baseCostUsd: editItem.baseCostUsd,
							profitMarginPct: editItem.profitMarginPct,
							baseSalePriceUsd: editItem.baseSalePriceUsd,
							categoryName: editItem.category.name,
							initialStock: 0,
							comboQtyThreshold: editItem.comboQtyThreshold ?? undefined,
							comboPriceUsd: editItem.comboPriceUsd ?? undefined,
						}
					: {
							name: '',
							brand: '',
							unit: '',
							baseCostUsd: 0,
							profitMarginPct: 30,
							baseSalePriceUsd: 0,
							categoryName: '',
							initialStock: 0,
							comboQtyThreshold: undefined,
							comboPriceUsd: undefined,
						},
			)
		}
	}, [open, editItem, form])

	// useWatch for combo preview only — no effects derive from these
	const watchCost = useWatch({ control: form.control, name: 'baseCostUsd' }) ?? 0
	const watchMargin = useWatch({ control: form.control, name: 'profitMarginPct' }) ?? 0
	const watchComboQty = useWatch({ control: form.control, name: 'comboQtyThreshold' })
	const watchComboPrice = useWatch({ control: form.control, name: 'comboPriceUsd' })

	const comboTotalPreview =
		watchComboQty != null && watchComboQty > 0 &&
		watchComboPrice != null && watchComboPrice > 0
			? watchComboQty * watchComboPrice
			: null

	const onSubmit = (data: ItemFormValues) => {
		startTransition(async () => {
			const result = await addOrUpdateItem(data, editItem?.id)
			if (result.error) {
				toast.error(result.reason ?? result.message)
			} else {
				toast.success(
					isEdit ? t('toast_item_updated') : t('toast_item_created'),
				)
				form.reset()
				handleOpenChange(false)
				onSuccess()
			}
		})
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='flex flex-col sm:max-w-lg max-h-[90dvh] overflow-hidden gap-0 p-0'>
				<DialogHeader className='px-6 pt-6 pb-4 shrink-0'>
					<DialogTitle>
						{isEdit ? t('dialog_edit_item_title') : t('dialog_add_item_title')}
					</DialogTitle>
					<DialogDescription>
						{isEdit ? t('dialog_edit_item_desc') : t('dialog_add_item_desc')}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='flex flex-col flex-1 min-h-0'
					>
						<div className='flex-1 overflow-y-auto min-h-0 px-6 space-y-4 pb-2'>
							{/* Name */}
							<FormField
								control={form.control}
								name='name'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_name')}</FormLabel>
										<FormControl>
											<Input
												placeholder={t('label_name_placeholder')}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Category & Brand row */}
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 items-baseline'>
								<FormField
									control={form.control}
									name='categoryName'
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('label_category')}</FormLabel>
											<CreatableCombobox
												options={categoryNames}
												value={field.value}
												onChange={field.onChange}
												placeholder={t('label_category_placeholder')}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='brand'
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('label_brand')}</FormLabel>
											<CreatableCombobox
												options={brandNames}
												value={field.value ?? ''}
												onChange={field.onChange}
												placeholder={t('label_brand_placeholder')}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Unit & Initial Stock */}
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 items-baseline'>
								<FormField
									control={form.control}
									name='unit'
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('label_unit')}</FormLabel>
											<FormControl>
												<Input
													placeholder={t('label_unit_placeholder')}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								{!isEdit && (
									<FormField
										control={form.control}
										name='initialStock'
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t('label_initial_stock')}</FormLabel>
												<FormControl>
													<NumericInput
														integer
														value={field.value}
														onChange={field.onChange}
														onBlur={field.onBlur}
														placeholder='0'
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>

							{/* Cost · Margin · Sale Price — three-way reactive fields */}
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 items-baseline'>
								{/* Cost */}
								<FormField
									control={form.control}
									name='baseCostUsd'
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('label_cost_usd')}</FormLabel>
											<FormControl>
												<NumericInput
													value={field.value}
													onBlur={field.onBlur}
													placeholder='0.00'
													onChange={cost => {
														field.onChange(cost)
														// Recalculate sale price from the new cost + existing margin
														const margin = form.getValues('profitMarginPct') ?? 0
														form.setValue(
															'baseSalePriceUsd',
															cost > 0 ? cost * (1 + margin / 100) : 0,
															{ shouldDirty: true },
														)
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								{/* Margin */}
								<FormField
									control={form.control}
									name='profitMarginPct'
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('label_margin_pct')}</FormLabel>
											<FormControl>
												<NumericInput
													value={field.value}
													onBlur={field.onBlur}
													onChange={margin => {
														field.onChange(margin)
														// Recalculate sale price from existing cost + new margin
														const cost = form.getValues('baseCostUsd') ?? 0
														form.setValue(
															'baseSalePriceUsd',
															cost > 0 ? cost * (1 + margin / 100) : 0,
															{ shouldDirty: true },
														)
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Sale Price — reverse-calculates margin when edited */}
							<FormField
								control={form.control}
								name='baseSalePriceUsd'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_sale_price')}</FormLabel>
										<FormControl>
											<NumericInput
												value={field.value ?? 0}
												onBlur={field.onBlur}
												placeholder='0.00'
												onChange={price => {
													field.onChange(price)
													// Reverse-calculate margin from the new sale price + existing cost
													const cost = form.getValues('baseCostUsd') ?? 0
													if (cost > 0 && price > 0) {
														form.setValue(
															'profitMarginPct',
															((price - cost) / cost) * 100,
															{ shouldDirty: true },
														)
													}
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Separator />

							{/* Combo Pricing (optional) */}
							<p className='text-xs text-muted-foreground'>
								{t('label_combo_pricing')}
							</p>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 items-baseline'>
								<FormField
									control={form.control}
									name='comboQtyThreshold'
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('label_combo_min_qty')}</FormLabel>
											<FormControl>
												{/* Optional integer — inline input to support undefined */}
												<Input
													type='text'
													inputMode='numeric'
													placeholder='e.g. 6'
													value={field.value ?? ''}
													onChange={e => {
														const raw = e.target.value
														if (raw === '' || /^\d*$/.test(raw)) {
															const v = parseInt(raw, 10)
															field.onChange(raw === '' || isNaN(v) ? undefined : v)
														}
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='comboPriceUsd'
									render={({ field }) => {
										const regularPrice = watchCost * (1 + watchMargin / 100)
										return (
											<FormItem>
												<FormLabel>{t('label_combo_price')}</FormLabel>
												<div className='flex gap-1.5'>
													{/* % / $ mode toggle */}
													<div className='flex rounded-md border overflow-hidden shrink-0'>
														<button
															type='button'
															onClick={() => {
																if (comboPriceMode === 'usd') {
																	if (field.value && regularPrice > 0) {
																		const pct =
																			((regularPrice - field.value) / regularPrice) * 100
																		setComboPctInput(
																			parseFloat(pct.toFixed(1)).toString(),
																		)
																	} else {
																		setComboPctInput('')
																	}
																	setComboPriceMode('pct')
																}
															}}
															className={cn(
																'px-2.5 py-1.5 text-xs font-medium transition-colors',
																comboPriceMode === 'pct'
																	? 'bg-primary text-primary-foreground'
																	: 'text-muted-foreground hover:bg-muted',
															)}
														>
															%
														</button>
														<button
															type='button'
															onClick={() => setComboPriceMode('usd')}
															className={cn(
																'px-2.5 py-1.5 text-xs font-medium transition-colors',
																comboPriceMode === 'usd'
																	? 'bg-primary text-primary-foreground'
																	: 'text-muted-foreground hover:bg-muted',
															)}
														>
															$
														</button>
													</div>
													<FormControl>
														{comboPriceMode === 'usd' ? (
															/* Optional decimal — inline to support undefined */
															<Input
																type='text'
																inputMode='decimal'
																placeholder='e.g. 5.00'
																value={field.value ?? ''}
																onChange={e => {
																	const raw = e.target.value
																	if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
																		const num = parseFloat(raw)
																		field.onChange(
																			raw === '' || isNaN(num) ? undefined : num,
																		)
																	}
																}}
															/>
														) : (
															<Input
																type='text'
																inputMode='decimal'
																placeholder='% off sale price'
																value={comboPctInput}
																onChange={e => {
																	const raw = e.target.value
																	if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
																		setComboPctInput(raw)
																		const pct = parseFloat(raw) || 0
																		const computed =
																			regularPrice > 0
																				? regularPrice * (1 - pct / 100)
																				: 0
																		field.onChange(
																			computed > 0
																				? parseFloat(computed.toFixed(4))
																				: undefined,
																		)
																	}
																}}
															/>
														)}
													</FormControl>
												</div>
												{comboPriceMode === 'pct' &&
													field.value != null &&
													field.value > 0 && (
														<p className='text-xs text-muted-foreground'>
															= ${field.value.toFixed(2)}/unit
														</p>
													)}
												<FormMessage />
											</FormItem>
										)
									}}
								/>
							</div>

							{/* Combo total preview */}
							{comboTotalPreview !== null && (
								<p className='text-sm text-muted-foreground'>
									{t('label_combo_preview', {
										qty: watchComboQty!,
										price: `$${watchComboPrice!.toFixed(2)}`,
										total: `$${comboTotalPreview.toFixed(2)}`,
									})}
								</p>
							)}
						</div>

						{/* Sticky footer */}
						<div className='px-6 py-4 border-t shrink-0'>
							<DialogFooter>
								<Button
									type='button'
									variant='outline'
									onClick={() => handleOpenChange(false)}
								>
									{t('label_cancel')}
								</Button>
								<Button type='submit' disabled={isPending}>
									{isPending && <Spinner className='size-4' />}
									{isEdit ? t('label_update') : t('label_create')}
								</Button>
							</DialogFooter>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
