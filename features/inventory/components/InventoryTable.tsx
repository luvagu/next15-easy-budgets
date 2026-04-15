'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState, useTransition } from 'react'
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	type SortingState,
	type ColumnFiltersState,
	type VisibilityState,
	type RowSelectionState,
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
	ShoppingCartIcon,
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
import { Spinner } from '@/components/ui/spinner'
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

	// Filters
	const [selectedCategory, setSelectedCategory] = useState('all')
	const [selectedBrand, setSelectedBrand] = useState('all')

	// Table state
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] =
		useLocalStorage<VisibilityState>('inventoryColumnVisibility', {})
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

	const fetchData = () => {
		startTransition(async () => {
			const result = await fetchInventoryData({
				categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
				brand: selectedBrand !== 'all' ? selectedBrand : undefined,
			})
			if (result) {
				setItems(result.items as InventoryItemWithCategory[])
				setCategories(result.categories)
				setBrands(result.brands)
			}
		})
	}

	useEffect(() => {
		fetchData()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCategory, selectedBrand])

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
		fetchData()
		onStatsRefresh()
	}

	const handleRegisterSale = () => {
		const selectedRows = table.getSelectedRowModel().rows.map(r => r.original)
		if (selectedRows.length === 0) {
			toast.warning(t('toast_select_items'))
			return
		}
		setSaleDialogOpen(true)
	}

	const handleSaleSuccess = () => {
		fetchData()
		onStatsRefresh()
		setRowSelection({})
	}

	const handleSaleItemRemoved = (itemId: string) => {
		setRowSelection(prev => {
			const next = { ...prev }
			delete next[itemId]
			return next
		})
	}

	const handleDelete = async (item: InventoryItemWithCategory) => {
		const result = await deleteItem(item.id)
		if (result.error) {
			toast.error(result.message)
		} else {
			toast.success(t('toast_item_deleted'))
			fetchData()
			onStatsRefresh()
		}
	}

	const columns = useMemo(
		() =>
			getColumns({
				onEdit: handleEdit,
				onAddStock: handleAddStock,
				onDelete: handleDelete,
				t,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	const table = useReactTable({
		data: items,
		columns,
		// Use the item's stable UUID so selection survives filter/sort changes
		getRowId: row => row.id,
		state: {
			sorting,
			columnFilters,
			columnVisibility: columnVisibility,
			rowSelection,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: v => {
			const newVal = typeof v === 'function' ? v(columnVisibility) : v
			setColumnVisibility(newVal)
		},
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		initialState: {
			pagination: { pageSize: 10 },
		},
	})

	const selectedRows = table.getSelectedRowModel().rows.map(r => r.original)
	const saleTotal = selectedRows.reduce((sum, r) => sum + r.baseSalePriceUsd, 0)

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
				<Button size='sm' variant='outline' onClick={handleRegisterSale}>
					<ShoppingCartIcon className='size-3.5' />
					{t('label_register_sale')}
					{selectedRows.length > 0 && ` (${selectedRows.length})`}
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
				onCategoryChange={setSelectedCategory}
				selectedBrand={selectedBrand}
				onBrandChange={setSelectedBrand}
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
						{isLoading && items.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='h-32 text-center'
								>
									<Spinner className='mx-auto size-5' />
								</TableCell>
							</TableRow>
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
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() ? 'selected' : undefined}
								>
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

			<DataTablePagination table={table} />

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
				selectedItems={selectedRows}
				onSuccess={handleSaleSuccess}
				onItemRemoved={handleSaleItemRemoved}
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
				defaultUsdAmount={saleTotal}
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
