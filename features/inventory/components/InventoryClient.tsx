'use client'

import { useEffect, useState, useTransition } from 'react'
import { InventoryStats } from './InventoryStats'
import { InventoryTable } from './InventoryTable'
import { getDashboardStats } from '../actions/dashboard'
import { refreshExchangeRates } from '../actions/exchangeRates'
import type { DashboardStats } from '../types/inventory'
import type { ExchangeRatesCacheTable } from '@/drizzle/schema'
import { Spinner } from '@/components/ui/spinner'

type ExchangeRate = typeof ExchangeRatesCacheTable.$inferSelect

export function InventoryClient() {
	const [stats, setStats] = useState<DashboardStats | null>(null)
	const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
	const [isLoading, startTransition] = useTransition()

	useEffect(() => {
		startTransition(async () => {
			const [statsResult, ratesResult] = await Promise.all([
				getDashboardStats(),
				refreshExchangeRates(),
			])
			if (statsResult) setStats(statsResult)
			if (ratesResult.rates) setExchangeRates(ratesResult.rates)
		})
	}, [])

	const ratesMap = exchangeRates.reduce(
		(acc, r) => {
			acc[r.currencyCode] = r.rateToUsd
			return acc
		},
		{} as Record<string, number>,
	)

	if (isLoading && !stats) {
		return (
			<div className='flex items-center justify-center py-20'>
				<Spinner className='size-6' />
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-4 sm:gap-6'>
			<InventoryStats stats={stats} />
			<InventoryTable
				exchangeRates={ratesMap}
				onStatsRefresh={() => {
					startTransition(async () => {
						const freshStats = await getDashboardStats()
						if (freshStats) setStats(freshStats)
					})
				}}
			/>
		</div>
	)
}
