'use client'

import { useTranslations } from 'next-intl'
import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SearchIcon, ShoppingCartIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react'
import type { InventoryCategory } from '../../types/inventory'

interface DataTableToolbarProps<TData> {
	table: Table<TData>
	categories: InventoryCategory[]
	brands: string[]
	selectedCategory: string
	onCategoryChange: (categoryId: string) => void
	selectedBrand: string
	onBrandChange: (brand: string) => void
	search: string
	onSearchChange: (value: string) => void
	cartCount: number
	onOpenCart: () => void
}

export function DataTableToolbar<TData>({
	table,
	categories,
	brands,
	selectedCategory,
	onCategoryChange,
	selectedBrand,
	onBrandChange,
	search,
	onSearchChange,
	cartCount,
	onOpenCart,
}: DataTableToolbarProps<TData>) {
	const t = useTranslations('inventory')

	const COLUMN_LABELS: Record<string, string> = {
		name: t('col_item'),
		unit: t('col_unit'),
		baseCostUsd: t('col_cost'),
		stockQty: t('col_stock'),
		salePrice: t('label_sale_price'),
		profitMarginPct: t('col_margin'),
	}

	const isFiltered =
		search !== '' || selectedCategory !== 'all' || selectedBrand !== 'all'

	return (
		<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap'>
			{/* Search */}
			<div className='relative flex-1 min-w-45 max-w-sm bg-background'>
				<SearchIcon className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
				<Input
					placeholder={t('label_search_placeholder')}
					value={search}
					onChange={e => onSearchChange(e.target.value)}
					className='pl-8 h-8'
				/>
			</div>

			<div className='flex items-center gap-2 flex-wrap'>
				{/* Category filter */}
				<Select value={selectedCategory} onValueChange={onCategoryChange}>
					<SelectTrigger size='sm' className='min-w-30 bg-background'>
						<SelectValue placeholder={t('label_category')} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>{t('label_all_categories')}</SelectItem>
						{categories.map(cat => (
							<SelectItem key={cat.id} value={cat.id}>
								{cat.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Brand filter */}
				{brands.length > 0 && (
					<Select value={selectedBrand} onValueChange={onBrandChange}>
						<SelectTrigger size='sm' className='min-w-25 bg-background'>
							<SelectValue placeholder={t('label_brand')} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>{t('label_all_brands')}</SelectItem>
							{brands.map(brand => (
								<SelectItem key={brand} value={brand}>
									{brand}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* Cart button */}
				<Button
					variant={cartCount > 0 ? 'default' : 'outline'}
					size='sm'
					onClick={onOpenCart}
				>
					<ShoppingCartIcon className='size-3.5' />
					{t('label_cart_button', { count: String(cartCount) })}
				</Button>

				{/* Column visibility toggle */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' size='sm'>
							<SlidersHorizontalIcon className='size-3.5' />
							<span className='hidden sm:inline'>{t('label_columns')}</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end' className='w-37.5'>
						<DropdownMenuLabel>{t('label_toggle_columns')}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{table
							.getAllColumns()
							.filter(col => col.getCanHide())
							.map(column => (
								<DropdownMenuCheckboxItem
									key={column.id}
									checked={column.getIsVisible()}
									onCheckedChange={value => column.toggleVisibility(!!value)}
								>
									{COLUMN_LABELS[column.id] ?? column.id}
								</DropdownMenuCheckboxItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Clear filters */}
				{isFiltered && (
					<Button
						variant='ghost'
						size='sm'
						onClick={() => {
							onSearchChange('')
							onCategoryChange('all')
							onBrandChange('all')
						}}
					>
						{t('label_reset')}
						<XIcon className='size-3.5' />
					</Button>
				)}
			</div>
		</div>
	)
}
