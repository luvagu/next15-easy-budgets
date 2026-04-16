'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Undo2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { getSalesHistory } from '../actions/invoices'
import { ReturnItemsDialog } from './ReturnItemsDialog'
import type { InvoiceWithLineItems } from '../types/inventory'
import { INVOICE_NUM_PREFIX } from '../constants/constants'

interface SalesHistoryDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onStockChanged: () => void
}

function formatUsd(value: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(value)
}

function StatusBadge({
	status,
	t,
}: {
	status: string
	t: ReturnType<typeof useTranslations<'inventory'>>
}) {
	if (status === 'completed') {
		return (
			<Badge
				variant='outline'
				className='border-green-500 text-green-600 shrink-0'
			>
				{t('label_sale_status_completed')}
			</Badge>
		)
	}
	if (status === 'partial_refund') {
		return (
			<Badge
				variant='outline'
				className='border-amber-500 text-amber-600 shrink-0'
			>
				{t('label_sale_status_partial_refund')}
			</Badge>
		)
	}
	return (
		<Badge variant='secondary' className='shrink-0'>
			{t('label_sale_status_cancelled')}
		</Badge>
	)
}

export function SalesHistoryDialog({
	open,
	onOpenChange,
	onStockChanged,
}: SalesHistoryDialogProps) {
	const t = useTranslations('inventory')
	const [invoices, setInvoices] = useState<InvoiceWithLineItems[]>([])
	const [isLoading, startLoading] = useTransition()
	const [returnInvoice, setReturnInvoice] =
		useState<InvoiceWithLineItems | null>(null)

	const loadInvoices = () => {
		startLoading(async () => {
			const result = await getSalesHistory()
			if (result.error || !result.data) {
				toast.error(result.message)
				return
			}
			setInvoices(result.data)
		})
	}

	useEffect(() => {
		if (!open) return
		loadInvoices()
	}, [open])

	const handleReturnSuccess = () => {
		loadInvoices()
		onStockChanged()
	}

	const isActionable = (
		status: string,
	): status is 'completed' | 'partial_refund' =>
		status === 'completed' || status === 'partial_refund'

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className='flex flex-col sm:max-w-2xl max-h-[90dvh] overflow-hidden gap-0 p-0'>
					<DialogHeader className='px-4 sm:px-6 pt-5 pb-4 shrink-0'>
						<DialogTitle>{t('dialog_sales_history_title')}</DialogTitle>
						<DialogDescription>
							{t('dialog_sales_history_desc')}
						</DialogDescription>
					</DialogHeader>

					<div className='flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 pb-4 space-y-2'>
						{isLoading ? (
							<div className='flex items-center justify-center py-12'>
								<Spinner className='size-4' />
							</div>
						) : invoices.length === 0 ? (
							<p className='text-center text-sm text-muted-foreground py-12'>
								{t('label_no_sales')}
							</p>
						) : (
							invoices.map(inv => (
								<div key={inv.id} className='rounded-md border p-3 space-y-1.5'>
									{/* Row 1: invoice id · customer · date · status */}
									<div className='flex items-start justify-between gap-2'>
										<div className='min-w-0'>
											<p className='text-sm font-medium truncate'>
												<span className='text-muted-foreground font-mono'>
													{`${INVOICE_NUM_PREFIX}${inv.invoiceNumber}`}
												</span>
												{' · '}
												{inv.customerName}
											</p>
											<p className='text-xs text-muted-foreground'>
												{format(new Date(inv.createdAt), 'PPP p')}
											</p>
										</div>
										<StatusBadge status={inv.status} t={t} />
									</div>

									{/* Row 2: items preview · total · return button */}
									<div className='flex items-center justify-between gap-2'>
										<p className='text-xs text-muted-foreground truncate'>
											{t('col_items_count', {
												count: String(inv.lineItems.length),
											})}
											{inv.lineItems.length > 0 && (
												<>
													{' — '}
													{inv.lineItems
														.slice(0, 3)
														.map(li => li.item?.name ?? '—')
														.join(', ')}
													{inv.lineItems.length > 3 && '…'}
												</>
											)}
										</p>
										<div className='flex items-center gap-2 shrink-0'>
											<span className='text-sm font-semibold tabular-nums'>
												{formatUsd(inv.totalAmountUsd)}
											</span>
											{isActionable(inv.status) && (
												<Button
													type='button'
													variant='ghost'
													size='icon-sm'
													onClick={() => setReturnInvoice(inv)}
												>
													<Undo2Icon className='size-3.5 text-amber-600' />
												</Button>
											)}
										</div>
									</div>

									{/* Discount row */}
									{(inv as typeof inv & { discountAmountUsd?: number })
										.discountAmountUsd! > 0 && (
										<p className='text-[10px] text-muted-foreground'>
											{t('label_discount')}: −
											{formatUsd(
												(inv as typeof inv & { discountAmountUsd: number })
													.discountAmountUsd,
											)}
										</p>
									)}

									{/* Credit loan link */}
									{inv.loan && (
										<p className='text-[10px] text-muted-foreground'>
											{t('label_credit')} → {inv.loan.name}
										</p>
									)}
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Return dialog — rendered outside the history dialog to avoid nested portal issues */}
			{returnInvoice && (
				<ReturnItemsDialog
					open={returnInvoice !== null}
					onOpenChange={open => {
						if (!open) setReturnInvoice(null)
					}}
					invoice={returnInvoice}
					onSuccess={handleReturnSuccess}
				/>
			)}
		</>
	)
}
