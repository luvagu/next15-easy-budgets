'use client'

import { useTranslations } from 'next-intl'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	DollarSignIcon,
	TrendingUpIcon,
	AlertTriangleIcon,
	TrophyIcon,
} from 'lucide-react'
import type { DashboardStats } from '../types/inventory'

function formatUsd(value: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(value)
}

export function InventoryStats({ stats }: { stats: DashboardStats | null }) {
	const t = useTranslations('inventory')

	return (
		<div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
			{/* Total Inventory Value */}
			<Card>
				<CardHeader className='pb-2'>
					<CardDescription className='flex items-center gap-1.5'>
						<DollarSignIcon className='size-3.5' />
						{t('stat_inventory_value')}
					</CardDescription>
					<CardTitle className='text-xl sm:text-2xl tabular-nums'>
						{stats ? formatUsd(stats.totalInventoryValue) : '—'}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs text-muted-foreground'>
						{t('stat_inventory_value_desc')}
					</p>
				</CardContent>
			</Card>

			{/* Gross Profit MTD */}
			<Card>
				<CardHeader className='pb-2'>
					<CardDescription className='flex items-center gap-1.5'>
						<TrendingUpIcon className='size-3.5' />
						{t('stat_gross_profit')}
					</CardDescription>
					<CardTitle className='text-xl sm:text-2xl tabular-nums'>
						{stats ? formatUsd(stats.grossProfitMTD) : '—'}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs text-muted-foreground'>
						{t('stat_gross_profit_desc')}
					</p>
				</CardContent>
			</Card>

			{/* Low Stock Alerts */}
			<Card>
				<CardHeader className='pb-2'>
					<CardDescription className='flex items-center gap-1.5'>
						<AlertTriangleIcon
							className={`size-3.5 ${
								stats && stats.lowStockCount > 0
									? 'text-amber-500'
									: ''
							}`}
						/>
						{t('stat_low_stock')}
					</CardDescription>
					<CardTitle
						className={`text-xl sm:text-2xl tabular-nums ${
							stats && stats.lowStockCount > 0
								? 'text-amber-600'
								: ''
						}`}
					>
						{stats ? stats.lowStockCount : '—'}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs text-muted-foreground'>
						{t('stat_low_stock_desc')}
					</p>
				</CardContent>
			</Card>

			{/* Top 3 Items by Profit */}
			<Card>
				<CardHeader className='pb-2'>
					<CardDescription className='flex items-center gap-1.5'>
						<TrophyIcon className='size-3.5' />
						{t('stat_top_items')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{stats && stats.topItems.length > 0 ? (
						<ul className='space-y-1.5'>
							{stats.topItems.map((item, i) => (
								<li
									key={item.itemId ?? i}
									className='flex items-center justify-between gap-2 text-sm'
								>
									<span className='truncate font-medium'>
										{i + 1}. {item.itemName}
									</span>
									<span className='shrink-0 text-xs tabular-nums text-muted-foreground'>
										{formatUsd(item.totalProfit)}
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className='text-xs text-muted-foreground'>
							{t('stat_no_sales')}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
