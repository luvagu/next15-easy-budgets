'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	ArrowUpDownIcon,
	MoreHorizontalIcon,
	PencilIcon,
	PackagePlusIcon,
	ShoppingCartIcon,
	TrashIcon,
} from 'lucide-react'
import { cn, formatUsd } from '@/lib/utils'
import type { InventoryItemWithCategory } from '../../types/inventory'

type ColumnsConfig = {
	onEdit: (item: InventoryItemWithCategory) => void
	onAddStock: (item: InventoryItemWithCategory) => void
	onDelete: (item: InventoryItemWithCategory) => void
	onAddToCart: (item: InventoryItemWithCategory) => void
	cartItems: InventoryItemWithCategory[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	t: (key: any, values?: any) => string
}

export function getColumns(
	config: ColumnsConfig,
): ColumnDef<InventoryItemWithCategory>[] {
	const { onEdit, onAddStock, onDelete, onAddToCart, cartItems, t } = config

	return [
		// ─── Add to Cart (pinned first so it's always visible on mobile) ─────
		{
			id: 'cart',
			enableHiding: false,
			size: 40,
			cell: ({ row }) => {
				const item = row.original
				const isInCart = cartItems.some(i => i.id === item.id)
				const outOfStock = item.stockQty <= 0
				return (
					<Button
						variant='ghost'
						size='icon-sm'
						disabled={outOfStock}
						onClick={() => onAddToCart(item)}
						aria-label={
							outOfStock
								? t('label_out_of_stock')
								: isInCart
									? t('label_remove_from_cart')
									: t('label_add_to_cart')
						}
						className={cn(
							isInCart && !outOfStock && 'text-green-600 dark:text-green-400',
						)}
					>
						<ShoppingCartIcon
							className={cn('size-4', isInCart && !outOfStock && 'fill-current')}
						/>
					</Button>
				)
			},
		},

		// ─── Name / Category / Brand ─────────────────────
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<Button
					variant='ghost'
					size='sm'
					className='-ml-3'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					{t('col_item')}
					<ArrowUpDownIcon className='size-3.5' />
				</Button>
			),
			cell: ({ row }) => {
				const item = row.original
				return (
					<div className='min-w-35'>
						<div className='font-medium leading-tight'>{item.name}</div>
						<div className='text-xs text-muted-foreground leading-tight'>
							{item.category.name}
						</div>
						{item.brand && (
							<div className='text-xs italic text-muted-foreground/70 leading-tight'>
								{item.brand}
							</div>
						)}
					</div>
				)
			},
		},

		// ─── Unit ────────────────────────────────────────
		{
			accessorKey: 'unit',
			header: t('col_unit'),
			cell: ({ row }) => (
				<span className='text-muted-foreground'>{row.getValue('unit')}</span>
			),
		},

		// ─── Base Cost ───────────────────────────────────
		{
			accessorKey: 'baseCostUsd',
			header: t('col_cost'),
			cell: ({ row }) => (
				<span className='tabular-nums'>
					{formatUsd(row.getValue('baseCostUsd'))}
				</span>
			),
		},

		// ─── Stock Qty ───────────────────────────────────
		{
			accessorKey: 'stockQty',
			header: ({ column }) => (
				<Button
					variant='ghost'
					size='sm'
					className='-ml-3'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					{t('col_stock')}
					<ArrowUpDownIcon className='size-3.5' />
				</Button>
			),
			cell: ({ row }) => {
				const qty: number = row.getValue('stockQty')
				return (
					<Badge
						variant={qty === 0 ? 'destructive' : 'outline'}
						className={
							qty > 0 && qty <= 5
								? 'border-amber-500 text-amber-600 bg-amber-50'
								: ''
						}
					>
						{qty}
					</Badge>
				)
			},
		},

		// ─── Sale Price (USD) ────────────────────────────
		{
			id: 'salePrice',
			accessorKey: 'baseSalePriceUsd',
			header: ({ column }) => (
				<Button
					variant='ghost'
					size='sm'
					className='-ml-3'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					{t('col_price', { currency: 'USD' })}
					<ArrowUpDownIcon className='size-3.5' />
				</Button>
			),
			cell: ({ row }) => (
				<span className='tabular-nums font-medium'>
					{formatUsd(row.original.baseSalePriceUsd)}
				</span>
			),
		},

		// ─── Profit Margin ───────────────────────────────
		{
			accessorKey: 'profitMarginPct',
			header: t('col_margin'),
			cell: ({ row }) => {
				const margin: number = row.getValue('profitMarginPct')
				return (
					<Badge variant='secondary' className='tabular-nums'>
						{parseFloat(margin.toFixed(2))}%
					</Badge>
				)
			},
		},

		// ─── Actions ─────────────────────────────────────
		{
			id: 'actions',
			enableHiding: false,
			cell: ({ row }) => {
				const item = row.original
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' size='icon-sm'>
								<MoreHorizontalIcon className='size-4' />
								<span className='sr-only'>Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuItem onClick={() => onEdit(item)}>
								<PencilIcon className='size-3.5' />
								{t('label_edit_item')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onAddStock(item)}>
								<PackagePlusIcon className='size-3.5' />
								{t('label_add_stock')}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className='text-destructive focus:text-destructive'
								onClick={() => onDelete(item)}
							>
								<TrashIcon className='size-3.5' />
								{t('label_delete')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			},
		},
	]
}
