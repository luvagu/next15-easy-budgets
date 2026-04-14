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
	BarChart3Icon,
	PackageIcon,
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
		<div className='grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4'>
			{/* Total Inventory Value */}
			<Card className='gap-2 py-3 px-0'>
				<CardHeader className='pb-0 px-3 sm:px-4'>
					<CardDescription className='flex items-center gap-1 text-[11px]'>
						<DollarSignIcon className='size-3 shrink-0' />
						<span className='truncate'>{t('stat_inventory_value')}</span>
					</CardDescription>
					<CardTitle className='text-lg sm:text-2xl tabular-nums'>
						{stats ? formatUsd(stats.totalInventoryValue) : '—'}
					</CardTitle>
				</CardHeader>
				<CardContent className='px-3 sm:px-4'>
					<p className='text-[11px] text-muted-foreground leading-tight'>
						{t('stat_inventory_value_desc')}
					</p>
				</CardContent>
			</Card>

			{/* Gross Profit MTD */}
			<Card className='gap-2 py-3 px-0'>
				<CardHeader className='pb-0 px-3 sm:px-4'>
					<CardDescription className='flex items-center gap-1 text-[11px]'>
						<TrendingUpIcon className='size-3 shrink-0' />
						<span className='truncate'>{t('stat_gross_profit')}</span>
					</CardDescription>
					<CardTitle className='text-lg sm:text-2xl tabular-nums'>
						{stats ? formatUsd(stats.grossProfitMTD) : '—'}
					</CardTitle>
				</CardHeader>
				<CardContent className='px-3 sm:px-4 space-y-1.5'>
					{/* Description: redundant on mobile, show only on sm+ */}
					<p className='hidden sm:block text-[11px] text-muted-foreground leading-tight'>
						{t('stat_gross_profit_desc')}
					</p>
					{/* 2-col grid: label above, value below — safe for any amount size */}
					<div className='grid grid-cols-2 gap-x-2 gap-y-1'>
						<div className='space-y-0.5 min-w-0'>
							<p className='text-[10px] text-muted-foreground flex items-center gap-1'>
								<PackageIcon className='size-2.5 shrink-0' />
								<span className='truncate'>{t('stat_projected_revenue')}</span>
							</p>
							<p className='text-xs sm:text-sm tabular-nums font-semibold truncate'>
								{stats ? formatUsd(stats.projectedRevenue) : '—'}
							</p>
						</div>
						<div className='space-y-0.5 min-w-0'>
							<p className='text-[10px] text-muted-foreground flex items-center gap-1'>
								<BarChart3Icon className='size-2.5 shrink-0' />
								<span className='truncate'>{t('stat_total_sales')}</span>
							</p>
							<p className='text-xs sm:text-sm tabular-nums font-semibold truncate'>
								{stats ? formatUsd(stats.totalSalesAllTime) : '—'}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Low Stock Alerts */}
			<Card className='gap-2 py-3 px-0'>
				<CardHeader className='pb-0 px-3 sm:px-4'>
					<CardDescription className='flex items-center gap-1 text-[11px]'>
						<AlertTriangleIcon
							className={`size-3 shrink-0 ${
								stats && stats.lowStockCount > 0 ? 'text-amber-500' : ''
							}`}
						/>
						<span className='truncate'>{t('stat_low_stock')}</span>
					</CardDescription>
					<CardTitle
						className={`text-lg sm:text-2xl tabular-nums ${
							stats && stats.lowStockCount > 0 ? 'text-amber-600' : ''
						}`}
					>
						{stats ? stats.lowStockCount : '—'}
					</CardTitle>
				</CardHeader>
				<CardContent className='px-3 sm:px-4'>
					<p className='text-[11px] text-muted-foreground leading-tight'>
						{t('stat_low_stock_desc')}
					</p>
				</CardContent>
			</Card>

			{/* Top 3 Items by Profit */}
			<Card className='gap-2 py-3 px-0'>
				<CardHeader className='pb-0 px-3 sm:px-4'>
					<CardDescription className='flex items-center gap-1 text-[11px]'>
						<TrophyIcon className='size-3 shrink-0' />
						<span className='truncate'>{t('stat_top_items')}</span>
					</CardDescription>
				</CardHeader>
				<CardContent className='px-3 sm:px-4'>
					{stats && stats.topItems.length > 0 ? (
						<ul className='space-y-1'>
							{stats.topItems.map((item, i) => (
								<li
									key={item.itemId ?? i}
									className='flex items-center justify-between gap-2'
								>
									<span className='truncate text-[11px] font-medium'>
										{i + 1}. {item.itemName}
									</span>
									<span className='shrink-0 text-[11px] tabular-nums text-muted-foreground'>
										{formatUsd(item.totalProfit)}
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className='text-[11px] text-muted-foreground'>
							{t('stat_no_sales')}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
