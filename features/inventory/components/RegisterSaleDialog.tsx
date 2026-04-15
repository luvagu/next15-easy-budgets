'use client'

import { useEffect, useMemo, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { CalendarIcon, MinusIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getSaleInvoiceSchema } from '../schemas/inventory'
import { registerSale } from '../actions/invoices'
import type { InventoryItemWithCategory } from '../types/inventory'

type SaleFormValues = z.infer<ReturnType<typeof getSaleInvoiceSchema>>

interface RegisterSaleDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedItems: InventoryItemWithCategory[]
	onSuccess: () => void
}

function formatUsd(value: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(value)
}

export function RegisterSaleDialog({
	open,
	onOpenChange,
	selectedItems,
	onSuccess,
}: RegisterSaleDialogProps) {
	const t = useTranslations('inventory')
	const tForms = useTranslations('forms')
	const SaleSchema = getSaleInvoiceSchema(tForms('required'), t('error_sale_at_least_one_item'))
	const [isPending, startTransition] = useTransition()

	const tomorrow = () => {
		const d = new Date()
		d.setDate(d.getDate() + 1)
		return d
	}

	const form = useForm<SaleFormValues>({
		resolver: zodResolver(SaleSchema),
		defaultValues: {
			customerName: '',
			deliveryChargeUsd: 0,
			discountType: 'pct',
			discountValue: 0,
			isCreditSale: false,
			paymentDueDate: tomorrow(),
			items: [],
		},
	})

	// Reset form with fresh selected items every time dialog opens
	useEffect(() => {
		if (open && selectedItems.length > 0) {
			form.reset({
				customerName: '',
				deliveryChargeUsd: 0,
				discountType: 'pct',
				discountValue: 0,
				isCreditSale: false,
				paymentDueDate: tomorrow(),
				items: selectedItems.map(item => ({
					itemId: item.id,
					qty: 1,
				})),
			})
		}
	}, [open, selectedItems, form])

	const { fields, remove, update } = useFieldArray({
		control: form.control,
		name: 'items',
	})

	// Use useWatch to subscribe to specific form values safely
	const watchItems = useWatch({
		control: form.control,
		name: 'items',
		defaultValue: form.getValues('items') ?? [],
	}) as SaleFormValues['items']

	const watchDelivery = useWatch({
		control: form.control,
		name: 'deliveryChargeUsd',
		defaultValue: form.getValues('deliveryChargeUsd') ?? 0,
	}) as number

	const watchDiscountType = useWatch({
		control: form.control,
		name: 'discountType',
		defaultValue: 'pct',
	}) as 'pct' | 'fixed'

	const watchDiscountValue = useWatch({
		control: form.control,
		name: 'discountValue',
		defaultValue: 0,
	}) as number

	const watchIsCreditSale = useWatch({
		control: form.control,
		name: 'isCreditSale',
		defaultValue: form.getValues('isCreditSale') ?? false,
	}) as boolean

	// Build an item lookup map
	const itemMap = useMemo(() => {
		const map = new Map<string, InventoryItemWithCategory>()
		selectedItems.forEach(item => map.set(item.id, item))
		return map
	}, [selectedItems])

	// Calculate line totals and grand total
	const lineDetails = useMemo(() => {
		return watchItems.map(line => {
			const item = itemMap.get(line.itemId)
			if (!item)
				return {
					unitPrice: 0,
					lineTotal: 0,
					isCombo: false,
					comboPrice: 0,
				}

			const isCombo =
				item.comboQtyThreshold != null &&
				item.comboPriceUsd != null &&
				line.qty >= item.comboQtyThreshold

			const unitPrice = isCombo ? item.comboPriceUsd! : item.baseSalePriceUsd

			return {
				unitPrice,
				lineTotal: unitPrice * line.qty,
				isCombo,
				comboPrice: item.comboPriceUsd ?? 0,
			}
		})
	}, [watchItems, itemMap])

	const subtotal = lineDetails.reduce((sum, l) => sum + l.lineTotal, 0)
	const discountAmount =
		(watchDiscountValue ?? 0) <= 0
			? 0
			: watchDiscountType === 'pct'
				? subtotal * ((watchDiscountValue ?? 0) / 100)
				: Math.min(watchDiscountValue ?? 0, subtotal)
	const grandTotal = Math.max(0, subtotal + (watchDelivery ?? 0) - discountAmount)

	const onSubmit = (data: SaleFormValues) => {
		startTransition(async () => {
			const result = await registerSale(data)
			if (result.error) {
				toast.error(result.reason ?? result.message)
			} else {
				toast.success(t('toast_sale_registered'))
				form.reset()
				onOpenChange(false)
				onSuccess()
			}
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex flex-col sm:max-w-xl max-h-[90dvh] overflow-hidden gap-0 p-0'>
				<DialogHeader className='px-4 sm:px-6 pt-5 pb-4 shrink-0'>
					<DialogTitle>{t('dialog_sale_title')}</DialogTitle>
					<DialogDescription>
						{t('dialog_sale_desc', { count: String(selectedItems.length) })}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='flex flex-col flex-1 min-h-0'
					>
						{/* Scrollable body */}
						<div className='flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 space-y-4 pb-2'>
							{/* Customer Name */}
							<FormField
								control={form.control}
								name='customerName'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_customer_name')}</FormLabel>
										<FormControl>
											<Input
												placeholder={t('label_customer_placeholder')}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Separator />

							{/* Line Items */}
							<div className='space-y-3'>
								<p className='text-sm font-medium'>{t('label_items')}</p>
								{fields.map((field, index) => {
									const item = itemMap.get(field.itemId)
									if (!item) return null
									const detail = lineDetails[index]
									const qty = watchItems[index]?.qty ?? 1

									return (
										<div
											key={field.id}
											className='rounded-md border p-2.5 space-y-2'
										>
											{/* Row 1: name · total · delete */}
											<div className='flex items-start gap-2'>
												<p className='flex-1 text-sm font-medium truncate leading-tight'>
													{item.name}
													{item.brand ? ` (${item.brand})` : ''}
												</p>
												<div className='flex items-center gap-1 shrink-0'>
													<span className='text-sm font-semibold tabular-nums'>
														{formatUsd(detail.lineTotal)}
													</span>
													<Button
														type='button'
														variant='ghost'
														size='icon-sm'
														onClick={() => remove(index)}
													>
														<TrashIcon className='size-3.5 text-destructive' />
													</Button>
												</div>
											</div>

											{/* Row 2: price/stock meta · stepper */}
											<div className='flex items-center justify-between gap-2'>
												<div className='flex items-center gap-1.5 text-xs text-muted-foreground min-w-0'>
													<span className='truncate'>
														{formatUsd(item.baseSalePriceUsd)}/{item.unit}
														{' · '}
														{t('label_stock')}: {item.stockQty}
													</span>
													{detail.isCombo && (
														<Badge
															variant='secondary'
															className='text-[10px] px-1 py-0 shrink-0'
														>
															COMBO
														</Badge>
													)}
												</div>
												<div className='flex items-center gap-1 shrink-0'>
													<Button
														type='button'
														variant='outline'
														size='icon-sm'
														onClick={() => {
															const current = watchItems[index]?.qty ?? 1
															if (current > 1) {
																update(index, {
																	...fields[index],
																	qty: current - 1,
																})
															}
														}}
													>
														<MinusIcon className='size-3' />
													</Button>
													<Input
														type='number'
														min='1'
														max={item.stockQty}
														className='w-12 text-center h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
														value={qty}
														onChange={e => {
															const v = parseInt(e.target.value) || 1
															update(index, {
																...fields[index],
																qty: Math.min(Math.max(1, v), item.stockQty),
															})
														}}
													/>
													<Button
														type='button'
														variant='outline'
														size='icon-sm'
														onClick={() => {
															const current = watchItems[index]?.qty ?? 1
															if (current < item.stockQty) {
																update(index, {
																	...fields[index],
																	qty: current + 1,
																})
															}
														}}
													>
														<PlusIcon className='size-3' />
													</Button>
												</div>
											</div>
										</div>
									)
								})}

								{fields.length === 0 && (
									<p className='text-sm text-muted-foreground text-center py-4'>
										{t('label_no_basket_items')}
									</p>
								)}
							</div>

							<Separator />

							{/* Delivery + Discount — equal columns */}
							<div className='grid grid-cols-2 gap-3'>
							<FormField
								control={form.control}
								name='deliveryChargeUsd'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_delivery_usd')}</FormLabel>
										<FormControl>
											<Input
												type='number'
												step='0.01'
												min='0'
												className='[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
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

							{/* Discount */}
							<FormField
								control={form.control}
								name='discountValue'
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('label_discount')}</FormLabel>
										<div className='flex gap-1.5'>
											{/* type toggle */}
											<div className='flex rounded-md border overflow-hidden shrink-0'>
												<button
													type='button'
													onClick={() => form.setValue('discountType', 'pct')}
													className={cn(
														'px-2.5 py-1.5 text-xs font-medium transition-colors',
														watchDiscountType === 'pct'
															? 'bg-primary text-primary-foreground'
															: 'text-muted-foreground hover:bg-muted',
													)}
												>
													%
												</button>
												<button
													type='button'
													onClick={() => form.setValue('discountType', 'fixed')}
													className={cn(
														'px-2.5 py-1.5 text-xs font-medium transition-colors',
														watchDiscountType === 'fixed'
															? 'bg-primary text-primary-foreground'
															: 'text-muted-foreground hover:bg-muted',
													)}
												>
													$
												</button>
											</div>
											<FormControl>
												<Input
													type='number'
													step={watchDiscountType === 'pct' ? '1' : '0.01'}
													min='0'
													max={watchDiscountType === 'pct' ? '100' : undefined}
													className='[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
													{...field}
													onChange={e =>
														field.onChange(parseFloat(e.target.value) || 0)
													}
												/>
											</FormControl>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
							</div>{/* end delivery + discount grid */}

							{/* Credit Sale toggle */}
							<FormField
								control={form.control}
								name='isCreditSale'
								render={({ field }) => (
									<FormItem className='flex items-center justify-between rounded-md border p-3'>
										<div>
											<FormLabel className='text-sm font-medium'>
												{t('label_credit_sale')}
											</FormLabel>
											<p className='text-xs text-muted-foreground'>
												{t('label_due_date_hint')}
											</p>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							{/* Payment due date — only visible when credit sale is on */}
							{watchIsCreditSale && (
								<FormField
									control={form.control}
									name='paymentDueDate'
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('label_due_date')}</FormLabel>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant='outline'
															className={cn(
																'w-full justify-start font-normal',
																!field.value && 'text-muted-foreground',
															)}
														>
															<CalendarIcon className='size-3.5' />
															{field.value
																? format(field.value, 'PPP')
																: t('label_due_date_optional')}
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className='w-auto p-0' align='start'>
													<Calendar
														mode='single'
														selected={field.value}
														onSelect={field.onChange}
														disabled={date => date < new Date()}
													/>
												</PopoverContent>
											</Popover>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<Separator />

							{/* Totals */}
							<div className='space-y-1 text-sm'>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>
										{t('label_subtotal')}
									</span>
									<span className='tabular-nums'>{formatUsd(subtotal)}</span>
								</div>
								{(watchDelivery ?? 0) > 0 && (
									<div className='flex justify-between'>
										<span className='text-muted-foreground'>
											{t('label_delivery')}
										</span>
										<span className='tabular-nums'>
											{formatUsd(watchDelivery ?? 0)}
										</span>
									</div>
								)}
								{discountAmount > 0 && (
									<div className='flex justify-between text-green-600 dark:text-green-400'>
										<span>
											{t('label_discount')}
											{watchDiscountType === 'pct' && ` (${watchDiscountValue}%)`}
										</span>
										<span className='tabular-nums'>
											−{formatUsd(discountAmount)}
										</span>
									</div>
								)}
								<div className='flex justify-between font-semibold text-base'>
									<span>{t('label_total')}</span>
									<span className='tabular-nums'>{formatUsd(grandTotal)}</span>
								</div>
							</div>
						</div>

						{/* Sticky footer */}
						<div className='px-4 py-3 border-t shrink-0'>
							<div className='flex gap-2 justify-end'>
								<Button
									type='button'
									variant='outline'
									className='flex-1 sm:flex-none'
									onClick={() => onOpenChange(false)}
								>
									{t('label_cancel')}
								</Button>
								<Button
									type='submit'
									className='flex-1 sm:flex-none'
									disabled={isPending || fields.length === 0}
								>
									{isPending && <Spinner className='size-4' />}
									{t('label_complete_sale')}
								</Button>
							</div>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
