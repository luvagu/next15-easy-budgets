'use client'

import { useTranslations } from 'next-intl'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronsLeftIcon,
	ChevronsRightIcon,
} from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50]

interface DataTablePaginationProps<TData> {
	table: Table<TData>
}

export function DataTablePagination<TData>({
	table,
}: DataTablePaginationProps<TData>) {
	const t = useTranslations('inventory')
	const selectedCount = table.getFilteredSelectedRowModel().rows.length
	const totalCount = table.getFilteredRowModel().rows.length

	return (
		<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2'>
			<div className='text-xs text-muted-foreground tabular-nums'>
				{t('label_selected_of', {
					selected: String(selectedCount),
					total: String(totalCount),
				})}
			</div>

			<div className='flex items-center gap-4'>
				{/* Rows per page */}
				<div className='flex items-center gap-2'>
					<span className='text-xs text-muted-foreground whitespace-nowrap'>
						{t('label_rows')}
					</span>
					<Select
						value={String(table.getState().pagination.pageSize)}
						onValueChange={value => table.setPageSize(Number(value))}
					>
						<SelectTrigger size='sm' className='w-20 bg-background'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PAGE_SIZE_OPTIONS.map(size => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Page info */}
				<span className='text-xs text-muted-foreground tabular-nums whitespace-nowrap'>
					{t('label_page_of', {
						page: String(table.getState().pagination.pageIndex + 1),
						total: String(table.getPageCount() || 1),
					})}
				</span>

				{/* Navigation */}
				<div className='flex items-center gap-1'>
					<Button
						variant='outline'
						size='icon-sm'
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronsLeftIcon className='size-3.5' />
					</Button>
					<Button
						variant='outline'
						size='icon-sm'
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronLeftIcon className='size-3.5' />
					</Button>
					<Button
						variant='outline'
						size='icon-sm'
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<ChevronRightIcon className='size-3.5' />
					</Button>
					<Button
						variant='outline'
						size='icon-sm'
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<ChevronsRightIcon className='size-3.5' />
					</Button>
				</div>
			</div>
		</div>
	)
}
