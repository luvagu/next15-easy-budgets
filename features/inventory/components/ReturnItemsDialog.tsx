'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NumericInput } from '@/components/ui/numeric-input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { processReturn } from '../actions/invoices'
import type { InvoiceWithLineItems } from '../types/inventory'

interface ReturnItemsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	invoice: InvoiceWithLineItems
	onSuccess: () => void
}

function formatUsd(value: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(value)
}

export function ReturnItemsDialog({
	open,
	onOpenChange,
	invoice,
	onSuccess,
}: ReturnItemsDialogProps) {
	const t = useTranslations('inventory')
	const [isPending, startTransition] = useTransition()

	// qty to return per line item id — initialise to 0
	const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})

	// Returnable = line items that still have qty available to return
	const returnableItems = useMemo(
		() =>
			invoice.lineItems.filter(
				li =>
					li.qty - (li as typeof li & { refundedQty: number }).refundedQty > 0,
			),
		[invoice.lineItems],
	)

	const getQty = useCallback((id: string) => returnQtys[id] ?? 0, [returnQtys])

	const getReturnable = (li: (typeof returnableItems)[number]) =>
		li.qty - ((li as typeof li & { refundedQty: number }).refundedQty ?? 0)

	const setQty = (id: string, val: number, max: number) =>
		setReturnQtys(prev => ({ ...prev, [id]: Math.min(Math.max(0, val), max) }))

	const handleReturnAll = () => {
		const all: Record<string, number> = {}
		for (const li of returnableItems) {
			all[li.id] = getReturnable(li)
		}
		setReturnQtys(all)
	}

	const refundTotal = useMemo(() => {
		return returnableItems.reduce((sum, li) => {
			const qty = getQty(li.id)
			return sum + qty * li.snapshotSalePriceUsd
		}, 0)
	}, [returnableItems, getQty])

	const hasAnyQty = returnableItems.some(li => getQty(li.id) > 0)

	const handleSubmit = () => {
		const items = returnableItems
			.filter(li => getQty(li.id) > 0)
			.map(li => ({ lineItemId: li.id, qtyToReturn: getQty(li.id) }))

		startTransition(async () => {
			const result = await processReturn(invoice.id, items)
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(t('toast_return_processed'))
				onOpenChange(false)
				onSuccess()
			}
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex flex-col sm:max-w-lg max-h-[90dvh] overflow-hidden gap-0 p-0'>
				<DialogHeader className='px-4 sm:px-6 pt-5 pb-4 shrink-0'>
					<DialogTitle>
						{t('dialog_return_title', { customer: invoice.customerName })}
					</DialogTitle>
					<DialogDescription>{t('dialog_return_desc')}</DialogDescription>
				</DialogHeader>

				{/* Scrollable body */}
				<div className='flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 pb-2 space-y-3'>
					{returnableItems.length === 0 ? (
						<p className='text-center text-sm text-muted-foreground py-10'>
							{t('label_no_returnable_items')}
						</p>
					) : (
						<>
							{/* Return All shortcut */}
							<div className='flex justify-end'>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={handleReturnAll}
								>
									{t('label_return_all')}
								</Button>
							</div>

							{/* Line items */}
							{returnableItems.map(li => {
								const liTyped = li as typeof li & { refundedQty: number }
								const returnable = getReturnable(liTyped)
								const qty = getQty(li.id)

								return (
									<div key={li.id} className='rounded-md border p-3 space-y-2'>
										{/* Name row */}
										<div className='flex items-start justify-between gap-2'>
											<p className='text-sm font-medium truncate flex-1'>
												{li.item?.name ?? '—'}
												{li.item?.brand ? ` (${li.item.brand})` : ''}
											</p>
											<span className='text-xs tabular-nums text-muted-foreground shrink-0'>
												{formatUsd(li.snapshotSalePriceUsd)} × {returnable}
											</span>
										</div>

										{/* Stats + stepper row */}
										<div className='flex items-center justify-between gap-3'>
											<div className='flex items-center gap-2 text-xs text-muted-foreground flex-wrap'>
												<span>
													{t('label_qty_original')}: {li.qty}
												</span>
												{liTyped.refundedQty > 0 && (
													<Badge
														variant='secondary'
														className='text-[10px] px-1.5 py-0'
													>
														{t('label_qty_returned')}: {liTyped.refundedQty}
													</Badge>
												)}
												<span className='text-foreground font-medium'>
													{t('label_returnable')}: {returnable}
												</span>
											</div>

											{/* Stepper */}
											<div className='flex items-center gap-1 shrink-0'>
												<Button
													type='button'
													variant='outline'
													size='icon-sm'
													onClick={() => setQty(li.id, qty - 1, returnable)}
													disabled={qty <= 0}
												>
													<span className='text-sm leading-none'>−</span>
												</Button>
												<NumericInput
													integer
													value={qty}
													className='w-12 text-center h-7 text-sm'
													onChange={v => setQty(li.id, v, returnable)}
												/>
												<Button
													type='button'
													variant='outline'
													size='icon-sm'
													onClick={() => setQty(li.id, qty + 1, returnable)}
													disabled={qty >= returnable}
												>
													<span className='text-sm leading-none'>+</span>
												</Button>
											</div>
										</div>
									</div>
								)
							})}

							{/* Refund total */}
							{refundTotal > 0 && (
								<>
									<Separator />
									<div className='flex justify-between text-sm font-semibold'>
										<span>{t('label_refund_total')}</span>
										<span className='tabular-nums text-green-600 dark:text-green-400'>
											{formatUsd(refundTotal)}
										</span>
									</div>
								</>
							)}
						</>
					)}
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
							type='button'
							className='flex-1 sm:flex-none'
							disabled={isPending || !hasAnyQty}
							onClick={handleSubmit}
						>
							{isPending && <Spinner className='size-4' />}
							{t('label_process_return')}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
