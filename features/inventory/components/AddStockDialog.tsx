'use client'

import { useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
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
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { getAddStockSchema } from '../schemas/inventory'
import { addStock } from '../actions/items'
import type { InventoryItemWithCategory } from '../types/inventory'

const StockSchema = getAddStockSchema()
type StockFormValues = z.infer<typeof StockSchema>

interface AddStockDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	item: InventoryItemWithCategory | null
	onSuccess: () => void
}

export function AddStockDialog({
	open,
	onOpenChange,
	item,
	onSuccess,
}: AddStockDialogProps) {
	const t = useTranslations('inventory')
	const [isPending, startTransition] = useTransition()

	const form = useForm<StockFormValues>({
		resolver: zodResolver(StockSchema),
		defaultValues: {
			qty: 1,
			costPerUnit: 0,
		},
	})

	// Reset form with fresh item data every time dialog opens
	useEffect(() => {
		if (open && item) {
			form.reset({
				qty: 1,
				costPerUnit: item.baseCostUsd,
			})
		}
	}, [open, item, form])

	const watchQty = form.watch('qty')
	const watchCost = form.watch('costPerUnit')

	// WAC preview
	const currentStock = item?.stockQty ?? 0
	const currentCost = item?.baseCostUsd ?? 0
	const totalOldValue = currentCost * currentStock
	const totalNewValue = watchCost * watchQty
	const newTotalQty = currentStock + watchQty
	const wacPreview =
		newTotalQty > 0 ? (totalOldValue + totalNewValue) / newTotalQty : 0

	const onSubmit = (data: StockFormValues) => {
		if (!item) return
		startTransition(async () => {
			const result = await addStock(item.id, data)
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(t('toast_stock_added'))
				form.reset()
				onOpenChange(false)
				onSuccess()
			}
		})
	}

	if (!item) return null

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-sm'>
				<DialogHeader>
					<DialogTitle>{t('dialog_add_stock_title')}</DialogTitle>
					<DialogDescription>
						{item.name}
						{item.brand ? ` (${item.brand})` : ''}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='space-y-4'
					>
						{/* Current Stock (readonly) */}
						<div>
							<label className='text-sm font-medium'>
								{t('label_current_stock')}
							</label>
							<Input
								value={currentStock}
								disabled
								className='mt-1'
							/>
						</div>

						{/* Quantity to Add */}
						<FormField
							control={form.control}
							name='qty'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('label_qty_to_add')}</FormLabel>
									<FormControl>
										<Input
											type='number'
											step='1'
											min='1'
											{...field}
											onChange={e =>
												field.onChange(
													parseInt(e.target.value) || 1
												)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* New Cost per Unit */}
						<FormField
							control={form.control}
							name='costPerUnit'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('label_cost_per_unit')}</FormLabel>
									<FormControl>
										<Input
											type='number'
											step='0.01'
											min='0'
											{...field}
											onChange={e =>
												field.onChange(
													parseFloat(e.target.value) ||
														0
												)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* WAC Preview */}
						<p className='text-xs text-muted-foreground'>
							{t('label_wac_hint', { cost: `$${currentCost.toFixed(2)}` })}
						</p>
						{wacPreview > 0 && (
							<p className='text-sm text-muted-foreground'>
								{t('label_new_wac')}:{' '}
								<span className='font-semibold text-foreground'>
									${wacPreview.toFixed(2)}
								</span>{' '}
								&middot; {t('label_new_stock')}:{' '}
								<span className='font-semibold text-foreground'>
									{newTotalQty}
								</span>
							</p>
						)}

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
								{t('label_add_stock')}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
