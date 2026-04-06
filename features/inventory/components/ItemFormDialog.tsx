'use client'

import { useEffect, useTransition } from 'react'
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
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { getInventoryItemSchema } from '../schemas/inventory'
import { addOrUpdateItem } from '../actions/items'
import { CreatableCombobox } from './CreatableCombobox'
import type { InventoryItemWithCategory } from '../types/inventory'

const ItemSchema = getInventoryItemSchema()
type ItemFormValues = z.infer<typeof ItemSchema>

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
	const [isPending, startTransition] = useTransition()
	const isEdit = !!editItem

	const form = useForm<ItemFormValues>({
		resolver: zodResolver(ItemSchema),
		defaultValues: {
			name: '',
			brand: '',
			unit: '',
			baseCostUsd: 0,
			profitMarginPct: 30,
			categoryName: '',
			comboQtyThreshold: undefined,
			comboPriceUsd: undefined,
		},
	})

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
							categoryName: editItem.category.name,
							comboQtyThreshold: editItem.comboQtyThreshold ?? undefined,
							comboPriceUsd: editItem.comboPriceUsd ?? undefined,
						}
					: {
							name: '',
							brand: '',
							unit: '',
							baseCostUsd: 0,
							profitMarginPct: 30,
							categoryName: '',
							comboQtyThreshold: undefined,
							comboPriceUsd: undefined,
						},
			)
		}
	}, [open, editItem, form])

	const watchCost =
		useWatch({ control: form.control, name: 'baseCostUsd' }) ?? 0
	const watchMargin =
		useWatch({ control: form.control, name: 'profitMarginPct' }) ?? 0
	const previewSalePrice =
		watchCost > 0 && watchMargin >= 0 ? watchCost * (1 + watchMargin / 100) : 0

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
				onOpenChange(false)
				onSuccess()
			}
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? t('dialog_edit_item_title') : t('dialog_add_item_title')}
					</DialogTitle>
					<DialogDescription>
						{isEdit ? t('dialog_edit_item_desc') : t('dialog_add_item_desc')}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
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
						<div className='grid grid-cols-2 gap-3'>
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

						{/* Unit */}
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

						{/* Cost & Margin row */}
						<div className='grid grid-cols-2 gap-3'>
							<FormField
								control={form.control}
								name='baseCostUsd'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_cost_usd')}</FormLabel>
										<FormControl>
											<Input
												type='number'
												step='0.01'
												min='0'
												{...field}
												onChange={e =>
													field.onChange(parseFloat(e.target.value) || 0)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='profitMarginPct'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_margin_pct')}</FormLabel>
										<FormControl>
											<Input
												type='number'
												step='1'
												min='0'
												{...field}
												onChange={e =>
													field.onChange(parseFloat(e.target.value) || 0)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Sale Price Preview */}
						{previewSalePrice > 0 && (
							<p className='text-sm text-muted-foreground'>
								{t('label_sale_price')}:{' '}
								<span className='font-semibold text-foreground'>
									${previewSalePrice.toFixed(2)}
								</span>
							</p>
						)}

						<Separator />

						{/* Combo Pricing (optional) */}
						<p className='text-xs text-muted-foreground'>
							{t('label_combo_pricing')}
						</p>
						<div className='grid grid-cols-2 gap-3'>
							<FormField
								control={form.control}
								name='comboQtyThreshold'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_combo_min_qty')}</FormLabel>
										<FormControl>
											<Input
												type='number'
												step='1'
												min='1'
												placeholder='e.g. 6'
												value={field.value ?? ''}
												onChange={e => {
													const v = e.target.value
													field.onChange(v === '' ? undefined : parseInt(v))
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
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_combo_price')}</FormLabel>
										<FormControl>
											<Input
												type='number'
												step='0.01'
												min='0'
												placeholder='e.g. 5.00'
												value={field.value ?? ''}
												onChange={e => {
													const v = e.target.value
													field.onChange(v === '' ? undefined : parseFloat(v))
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={() => onOpenChange(false)}
							>
								{t('label_cancel')}
							</Button>
							<Button type='submit' disabled={isPending}>
								{isPending && <Spinner className='size-4' />}
								{isEdit ? t('label_update') : t('label_create')}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
