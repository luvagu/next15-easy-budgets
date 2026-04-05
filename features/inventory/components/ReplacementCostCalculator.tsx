'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircleIcon, AlertTriangleIcon } from 'lucide-react'

interface ReplacementCostCalculatorProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	exchangeRates: Record<string, number>
	defaultUsdAmount?: number
}

type LiveRates = { bcv: number; paralelo: number }

async function fetchLiveRates(): Promise<LiveRates | null> {
	try {
		const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
			signal: AbortSignal.timeout(5000),
		})
		if (res.ok) {
			const data: Array<{ fuente: string; promedio: number }> = await res.json()
			const oficial = data.find(d => d.fuente === 'oficial')
			const paralelo = data.find(d => d.fuente === 'paralelo')
			if (oficial?.promedio && paralelo?.promedio) {
				return { bcv: oficial.promedio, paralelo: paralelo.promedio }
			}
		}
	} catch {
		// fall through to DB-cache fallback
	}

	return null
}

function formatVes(value: number) {
	return `Bs. ${value.toLocaleString('es-VE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`
}

export function ReplacementCostCalculator({
	open,
	onOpenChange,
	exchangeRates,
	defaultUsdAmount,
}: ReplacementCostCalculatorProps) {
	const t = useTranslations('inventory')

	const [usdAmount, setUsdAmount] = useState(
		defaultUsdAmount && defaultUsdAmount > 0 ? defaultUsdAmount : 100,
	)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setUsdAmount(defaultUsdAmount && defaultUsdAmount > 0 ? defaultUsdAmount : 100)
	}, [defaultUsdAmount])
	const [rates, setRates] = useState<LiveRates | null>(null)
	const [apiError, setApiError] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [manualBrechaPct, setManualBrechaPct] = useState(20)

	useEffect(() => {
		if (!open) return
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsLoading(true)
		setApiError(false)

		fetchLiveRates().then(result => {
			if (result) {
				setRates(result)
				setApiError(false)
			} else {
				const baseBcv = exchangeRates.VES ?? 1
				setRates({ bcv: baseBcv, paralelo: baseBcv })
				setApiError(true)
			}
			setIsLoading(false)
		})
	}, [open, exchangeRates.VES])

	// Derived values — all computed inline so they react to any state change
	const activeBcv = rates?.bcv ?? 0
	const activeParalelo = apiError
		? activeBcv * (1 + manualBrechaPct / 100)
		: (rates?.paralelo ?? 0)

	const bcvAmount = usdAmount * activeBcv
	const paraleloAmount = usdAmount * activeParalelo
	const diffAmount = paraleloAmount - bcvAmount
	const brecha =
		activeBcv > 0 ? ((activeParalelo - activeBcv) / activeBcv) * 100 : 0
	const brechaIsHigh = brecha >= 15

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{t('dialog_rcalc_title')}</DialogTitle>
					<DialogDescription>{t('dialog_rcalc_desc')}</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					{/* API fallback alert */}
					{apiError && (
						<Alert className='border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-200'>
							<AlertCircleIcon className='size-4 shrink-0 text-amber-600 dark:text-amber-400' />
							<AlertDescription className='text-xs'>
								{t('rcalc_api_error')}
							</AlertDescription>
						</Alert>
					)}

					{/* Inputs */}
					<div className={`grid gap-3 ${apiError ? 'grid-cols-2' : 'grid-cols-1'}`}>
						<div className='space-y-1.5'>
							<Label>{t('label_usd_amount')}</Label>
							<Input
								type='number'
								min='0'
								step='0.01'
								value={usdAmount}
								onChange={e =>
									setUsdAmount(parseFloat(e.target.value) || 0)
								}
							/>
						</div>

						{/* Manual spread input — only shown in fallback mode */}
						{apiError && (
							<div className='space-y-1.5'>
								<Label>{t('rcalc_manual_brecha_pct')}</Label>
								<Input
									type='number'
									min='0'
									step='1'
									value={manualBrechaPct}
									onChange={e =>
										setManualBrechaPct(parseFloat(e.target.value) || 0)
									}
								/>
							</div>
						)}
					</div>

					{/* Rate cards */}
					{isLoading ? (
						<div className='flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground'>
							<Spinner className='size-4' />
							{t('rcalc_loading')}
						</div>
					) : rates ? (
						<div className='grid grid-cols-2 gap-3'>
							{/* BCV card */}
							<Card>
								<CardContent className='p-3 space-y-1.5'>
									<p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
										{t('rcalc_label_bcv')}
									</p>
									<p className='text-[11px] text-muted-foreground tabular-nums'>
										1 USD = {formatVes(activeBcv)}
									</p>
									<p className='text-xl font-bold tabular-nums leading-tight'>
										{formatVes(bcvAmount)}
									</p>
								</CardContent>
							</Card>

							{/* Paralelo card */}
							<Card className='border-destructive/50'>
								<CardContent className='p-3 space-y-1.5'>
									<p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
										{t('rcalc_label_paralelo')}
									</p>
									<p className='text-[11px] text-muted-foreground tabular-nums'>
										1 USD = {formatVes(activeParalelo)}
									</p>
									<p className='text-xl font-bold tabular-nums text-destructive leading-tight'>
										{formatVes(paraleloAmount)}
									</p>
								</CardContent>
							</Card>
						</div>
					) : null}

					{/* Difference row */}
					{rates && !isLoading && diffAmount > 0 && (
						<div className='flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm'>
							<span className='text-muted-foreground'>
								{t('rcalc_diff_label')}
							</span>
							<span className='font-semibold tabular-nums text-destructive text-right'>
								+{formatVes(diffAmount)}
								<span className='ml-1.5 text-xs font-normal opacity-70'>
									(≈ ${(activeParalelo > 0 ? diffAmount / activeParalelo : 0).toFixed(2)} USD)
								</span>
							</span>
						</div>
					)}

					{/* Brecha alert */}
					{rates && !isLoading && brecha > 0 && (
						<Alert variant={brechaIsHigh ? 'destructive' : 'default'}>
							<AlertTriangleIcon className='size-4 shrink-0' />
							<AlertDescription className='text-xs'>
								{t('rcalc_brecha_msg', { pct: brecha.toFixed(1) })}
							</AlertDescription>
						</Alert>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
