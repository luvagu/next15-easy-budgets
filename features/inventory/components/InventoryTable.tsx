'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	flexRender,
	type SortingState,
	type VisibilityState,
	type PaginationState,
} from '@tanstack/react-table'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
	PlusIcon,
	UploadIcon,
	CalculatorIcon,
	HistoryIcon,
	TagsIcon,
} from 'lucide-react'
import { getColumns } from './data-table/columns'
import { DataTablePagination } from './data-table/DataTablePagination'
import { DataTableToolbar } from './data-table/DataTableToolbar'
import { ItemFormDialog } from './ItemFormDialog'
import { AddStockDialog } from './AddStockDialog'
import { RegisterSaleDialog } from './RegisterSaleDialog'
import { BulkUploadDialog } from './BulkUploadDialog'
import { ReplacementCostCalculator } from './ReplacementCostCalculator'
import { SalesHistoryDialog } from './SalesHistoryDialog'
import { ManageTaxonomyDialog } from './ManageTaxonomyDialog'
import { fetchInventoryData } from '../actions/data'
import { deleteItem } from '../actions/items'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type {
	InventoryCategory,
	InventoryItemWithCategory,
} from '../types/inventory'

interface InventoryTableProps {
	exchangeRates: Record<string, number>
	onStatsRefresh: () => void
}

export function InventoryTable({
	exchangeRates,
	onStatsRefresh,
}: InventoryTableProps) {
	const t = useTranslations('inventory')
	const [items, setItems] = useState<InventoryItemWithCategory[]>([])
	const [categories, setCategories] = useState<InventoryCategory[]>([])
	const [brands, setBrands] = useState<string[]>([])
	const [totalCount, setTotalCount] = useState(0)
	const [isLoading, startTransition] = useTransition()

	// Dialog state
	const [itemFormOpen, setItemFormOpen] = useState(false)
	const [editItem, setEditItem] = useState<InventoryItemWithCategory | null>(
		null,
	)
	const [stockDialogOpen, setStockDialogOpen] = useState(false)
	const [stockItem, setStockItem] = useState<InventoryItemWithCategory | null>(
		null,
	)
	const [saleDialogOpen, setSaleDialogOpen] = useState(false)
	const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
	const [calcOpen, setCalcOpen] = useState(false)
	const [historyOpen, setHistoryOpen] = useState(false)
	const [taxonomyOpen, setTaxonomyOpen] = useState(false)

	// Server-side filter state
	const [selectedCategory, setSelectedCategory] = useState('all')
	const [selectedBrand, setSelectedBrand] = useState('all')
	const [searchInput, setSearchInput] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')

	// Table state
	const [sorting, setSorting] = useState<SortingState>([])
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})
	const [columnVisibility, setColumnVisibility] =
		useLocalStorage<VisibilityState>('inventoryColumnVisibility', {})

	// Cart state — persisted to localStorage so items survive page refresh
	const [cartItems, setCartItems, clearCart] = useLocalStorage<string[]>(
		'inventory-cart',
		[],
	)

	// Debounce search: after 300 ms of no typing, update debouncedSearch and reset to page 0
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchInput)
			setPagination(prev => ({ ...prev, pageIndex: 0 }))
		}, 300)
		return () => clearTimeout(timer)
	}, [searchInput])

	// Main fetch — runs on every pagination / filter change
	const fetchData = () => {
		startTransition(async () => {
			const result = await fetchInventoryData({
				categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
				brand: selectedBrand !== 'all' ? selectedBrand : undefined,
				search: debouncedSearch || undefined,
				limit: pagination.pageSize,
				offset: pagination.pageIndex * pagination.pageSize,
			})
			if (result) {
				setItems(result.items as InventoryItemWithCategory[])
				setCategories(result.categories)
				setBrands(result.brands)
				setTotalCount(result.totalCount)
			}
		})
	}

	// Keep a ref to the current fetchData so success handlers always call the latest version
	const fetchDataRef = useRef(fetchData)
	fetchDataRef.current = fetchData

	useEffect(() => {
		fetchDataRef.current()
	}, [
		pagination.pageIndex,
		pagination.pageSize,
		debouncedSearch,
		selectedCategory,
		selectedBrand,
	])

	// Reset page when category/brand filters change
	const handleCategoryChange = (value: string) => {
		setSelectedCategory(value)
		setPagination(prev => ({ ...prev, pageIndex: 0 }))
	}

	const handleBrandChange = (value: string) => {
		setSelectedBrand(value)
		setPagination(prev => ({ ...prev, pageIndex: 0 }))
	}

	// Action handlers
	const handleEdit = (item: InventoryItemWithCategory) => {
		setEditItem(item)
		setItemFormOpen(true)
	}

	const handleAddStock = (item: InventoryItemWithCategory) => {
		setStockItem(item)
		setStockDialogOpen(true)
	}

	const handleFormSuccess = () => {
		fetchDataRef.current()
		onStatsRefresh()
	}

	const handleSaleSuccess = () => {
		fetchDataRef.current()
		onStatsRefresh()
		clearCart()
	}

	const handleSaleItemRemoved = (itemId: string) => {
		setCartItems(prev => prev.filter(id => id !== itemId))
	}

	const handleClearCart = () => {
		clearCart()
		setSaleDialogOpen(false)
	}

	const handleDelete = async (item: InventoryItemWithCategory) => {
		const result = await deleteItem(item.id)
		if (result.error) {
			toast.error(result.message)
		} else {
			toast.success(t('toast_item_deleted'))
			fetchDataRef.current()
			onStatsRefresh()
		}
	}

	// Cart handlers
	const handleAddToCart = (item: InventoryItemWithCategory) => {
		const isAlreadyInCart = cartItems.includes(item.id)
		setCartItems(
			prev =>
				isAlreadyInCart
					? prev.filter(id => id !== item.id) // remove item
					: [...prev, item.id], // add item
		)
		if (isAlreadyInCart) {
			toast.warning(t('toast_item_removed_from_cart', { item: item.name }))
		} else {
			toast.success(t('toast_item_added_to_cart', { item: item.name }))
		}
	}

	const handleOpenCart = () => {
		if (cartItems.length === 0) {
			toast.warning(t('toast_select_items'))
			return
		}
		setSaleDialogOpen(true)
	}

	// Derive cart item objects from current page items + stable cart IDs
	const cartItemObjects = useMemo(
		() => items.filter(i => cartItems.includes(i.id)),
		[items, cartItems],
	)

	const columns = useMemo(
		() =>
			getColumns({
				onEdit: handleEdit,
				onAddStock: handleAddStock,
				onDelete: handleDelete,
				onAddToCart: handleAddToCart,
				cartItems,
				t,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[cartItems],
	)

	const table = useReactTable({
		data: items,
		columns,
		getRowId: row => row.id,
		state: {
			sorting,
			columnVisibility,
			pagination,
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		onColumnVisibilityChange: v => {
			const newVal = typeof v === 'function' ? v(columnVisibility) : v
			setColumnVisibility(newVal)
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		manualPagination: true,
		manualFiltering: true,
		pageCount: Math.ceil(totalCount / pagination.pageSize),
	})

	// Default USD amount for calculator — sum of cart items' sale prices
	const cartTotal = cartItemObjects.reduce(
		(sum, r) => sum + r.baseSalePriceUsd,
		0,
	)

	return (
		<div className='space-y-4 sm:space-y-6'>
			{/* Primary actions */}
			<div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
				<Button
					size='sm'
					onClick={() => {
						setEditItem(null)
						setItemFormOpen(true)
					}}
				>
					<PlusIcon className='size-3.5' />
					{t('label_add_item')}
				</Button>
				<Button
					size='sm'
					variant='outline'
					className='text-orange-700 dark:text-orange-500'
					onClick={() => setCalcOpen(true)}
				>
					<CalculatorIcon className='size-3.5' />
					{t('label_calculator')}
				</Button>
				<Button
					size='sm'
					variant='outline'
					onClick={() => setBulkUploadOpen(true)}
				>
					<UploadIcon className='size-3.5' />
					{t('label_bulk_upload')}
				</Button>
				<Button
					size='sm'
					variant='outline'
					onClick={() => setHistoryOpen(true)}
				>
					<HistoryIcon className='size-3.5' />
					{t('label_sales_history')}
				</Button>
				<Button
					size='sm'
					variant='outline'
					onClick={() => setTaxonomyOpen(true)}
				>
					<TagsIcon className='size-3.5' />
					{t('label_manage_taxonomy')}
				</Button>
			</div>

			<DataTableToolbar
				table={table}
				categories={categories}
				brands={brands}
				selectedCategory={selectedCategory}
				onCategoryChange={handleCategoryChange}
				selectedBrand={selectedBrand}
				onBrandChange={handleBrandChange}
				search={searchInput}
				onSearchChange={setSearchInput}
				cartCount={cartItems.length}
				onOpenCart={handleOpenCart}
			/>

			<div className='rounded-md border bg-card -mt-2 sm:-mt-3'>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map(header => (
									<TableHead
										key={header.id}
										style={{
											width:
												header.getSize() !== 150 ? header.getSize() : undefined,
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							// Skeleton rows — one placeholder row per page slot
							Array.from({ length: pagination.pageSize }).map((_, i) => (
								<TableRow key={i}>
									{table.getVisibleLeafColumns().map(col => (
										<TableCell key={col.id}>
											<Skeleton className='h-6 w-full' />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='h-32 text-center text-muted-foreground'
								>
									{t('label_no_items')}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map(row => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map(cell => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<DataTablePagination table={table} totalCount={totalCount} />

			{/* Dialogs */}
			<ItemFormDialog
				open={itemFormOpen}
				onOpenChange={setItemFormOpen}
				editItem={editItem}
				categoryNames={categories.map(c => c.name)}
				brandNames={brands}
				onSuccess={handleFormSuccess}
			/>

			<AddStockDialog
				open={stockDialogOpen}
				onOpenChange={setStockDialogOpen}
				item={stockItem}
				onSuccess={handleFormSuccess}
			/>

			<RegisterSaleDialog
				open={saleDialogOpen}
				onOpenChange={setSaleDialogOpen}
				selectedItems={cartItemObjects}
				onSuccess={handleSaleSuccess}
				onItemRemoved={handleSaleItemRemoved}
				onClearCart={handleClearCart}
			/>

			<BulkUploadDialog
				open={bulkUploadOpen}
				onOpenChange={setBulkUploadOpen}
				onSuccess={handleFormSuccess}
			/>

			<ReplacementCostCalculator
				open={calcOpen}
				onOpenChange={setCalcOpen}
				exchangeRates={exchangeRates}
				defaultUsdAmount={cartTotal}
			/>

			<SalesHistoryDialog
				open={historyOpen}
				onOpenChange={setHistoryOpen}
				onStockChanged={handleFormSuccess}
			/>

			<ManageTaxonomyDialog
				open={taxonomyOpen}
				onOpenChange={setTaxonomyOpen}
				onChanged={handleFormSuccess}
			/>
		</div>
	)
}
