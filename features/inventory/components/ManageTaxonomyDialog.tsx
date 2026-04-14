'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
	getCategoriesWithCount,
	createCategory,
	renameCategory,
	deleteCategory,
} from '../actions/categories'
import {
	getBrandsWithCount,
	renameBrand,
	deleteBrand,
} from '../actions/items'

interface CategoryRow {
	id: string
	name: string
	itemCount: number
}

interface BrandRow {
	brand: string
	itemCount: number
}

interface ManageTaxonomyDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onChanged?: () => void
}

export function ManageTaxonomyDialog({
	open,
	onOpenChange,
	onChanged,
}: ManageTaxonomyDialogProps) {
	const t = useTranslations('inventory')

	// ─── Categories state ─────────────────────────────────────────
	const [categories, setCategories] = useState<CategoryRow[]>([])
	const [catsLoading, startCatsTransition] = useTransition()
	const [renamingCatId, setRenamingCatId] = useState<string | null>(null)
	const [renameCatValue, setRenameCatValue] = useState('')
	const [newCatName, setNewCatName] = useState('')
	const [addingCat, startAddingCat] = useTransition()

	// ─── Brands state ─────────────────────────────────────────────
	const [brands, setBrands] = useState<BrandRow[]>([])
	const [brandsLoading, startBrandsTransition] = useTransition()
	const [renamingBrand, setRenamingBrand] = useState<string | null>(null)
	const [renameBrandValue, setRenameBrandValue] = useState('')

	const [isSaving, startSaving] = useTransition()

	// ─── Load data ────────────────────────────────────────────────
	const loadCategories = () => {
		startCatsTransition(async () => {
			const rows = await getCategoriesWithCount()
			setCategories(rows as CategoryRow[])
		})
	}

	const loadBrands = () => {
		startBrandsTransition(async () => {
			const rows = await getBrandsWithCount()
			setBrands(rows as BrandRow[])
		})
	}

	useEffect(() => {
		if (open) {
			loadCategories()
			loadBrands()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open])

	// ─── Category handlers ────────────────────────────────────────
	const handleAddCategory = () => {
		const name = newCatName.trim()
		if (!name) return

		startAddingCat(async () => {
			const result = await createCategory(name)
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(t('toast_category_created'))
				setNewCatName('')
				loadCategories()
				onChanged?.()
			}
		})
	}

	const handleStartRenameCat = (cat: CategoryRow) => {
		setRenamingCatId(cat.id)
		setRenameCatValue(cat.name)
	}

	const handleConfirmRenameCat = (id: string) => {
		const name = renameCatValue.trim()
		if (!name) return

		startSaving(async () => {
			const result = await renameCategory(id, name)
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(t('toast_category_renamed'))
				setRenamingCatId(null)
				loadCategories()
				onChanged?.()
			}
		})
	}

	const handleDeleteCategory = (id: string) => {
		startSaving(async () => {
			const result = await deleteCategory(id)
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(t('toast_category_deleted'))
				loadCategories()
				onChanged?.()
			}
		})
	}

	// ─── Brand handlers ───────────────────────────────────────────
	const handleStartRenameBrand = (brand: string) => {
		setRenamingBrand(brand)
		setRenameBrandValue(brand)
	}

	const handleConfirmRenameBrand = (oldName: string) => {
		const name = renameBrandValue.trim()
		if (!name) return

		startSaving(async () => {
			const result = await renameBrand(oldName, name)
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(t('toast_brand_renamed'))
				setRenamingBrand(null)
				loadBrands()
				onChanged?.()
			}
		})
	}

	const handleDeleteBrand = (name: string, count: number) => {
		startSaving(async () => {
			const result = await deleteBrand(name)
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(
					t('toast_brand_deleted', { count })
				)
				loadBrands()
				onChanged?.()
			}
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex flex-col sm:max-w-lg max-h-[90dvh] overflow-hidden gap-0 p-0'>
				<DialogHeader className='shrink-0 px-6 pt-6 pb-4'>
					<DialogTitle>{t('dialog_manage_taxonomy_title')}</DialogTitle>
					<DialogDescription>{t('dialog_manage_taxonomy_desc')}</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue='categories' className='flex flex-col flex-1 min-h-0'>
					<TabsList className='shrink-0 mx-6 mb-2 grid grid-cols-2'>
						<TabsTrigger value='categories'>{t('tab_categories')}</TabsTrigger>
						<TabsTrigger value='brands'>{t('tab_brands')}</TabsTrigger>
					</TabsList>

					{/* ── CATEGORIES TAB ─────────────────────────────── */}
					<TabsContent
						value='categories'
						className='flex flex-col flex-1 min-h-0 mt-0'
					>
						{/* Add category form */}
						<div className='shrink-0 px-6 pb-3'>
							<div className='flex gap-2'>
								<Input
									value={newCatName}
									onChange={e => setNewCatName(e.target.value)}
									placeholder={t('label_new_category_placeholder')}
									className='flex-1'
									onKeyDown={e => {
										if (e.key === 'Enter') {
											e.preventDefault()
											handleAddCategory()
										}
									}}
									disabled={addingCat || isSaving}
								/>
								<Button
									size='sm'
									onClick={handleAddCategory}
									disabled={!newCatName.trim() || addingCat || isSaving}
								>
									{addingCat ? (
										<Spinner className='size-3.5' />
									) : (
										<PlusIcon className='size-3.5' />
									)}
									{t('label_add_category')}
								</Button>
							</div>
						</div>

						{/* Category list */}
						<div className='flex-1 overflow-y-auto min-h-0 px-6 pb-6 space-y-1.5'>
							{catsLoading ? (
								<div className='flex justify-center py-8'>
									<Spinner className='size-5' />
								</div>
							) : categories.length === 0 ? (
								<p className='text-sm text-muted-foreground py-4 text-center'>
									—
								</p>
							) : (
								categories.map(cat => (
									<div
										key={cat.id}
										className='flex items-center gap-2 rounded-md border px-3 py-2'
									>
										{renamingCatId === cat.id ? (
											<>
												<Input
													value={renameCatValue}
													onChange={e => setRenameCatValue(e.target.value)}
													className='flex-1 h-7 text-sm'
													autoFocus
													onKeyDown={e => {
														if (e.key === 'Enter') handleConfirmRenameCat(cat.id)
														if (e.key === 'Escape') setRenamingCatId(null)
													}}
													disabled={isSaving}
												/>
												<Button
													size='icon'
													variant='ghost'
													className='size-7 shrink-0'
													onClick={() => handleConfirmRenameCat(cat.id)}
													disabled={isSaving || !renameCatValue.trim()}
												>
													<CheckIcon className='size-3.5' />
												</Button>
												<Button
													size='icon'
													variant='ghost'
													className='size-7 shrink-0'
													onClick={() => setRenamingCatId(null)}
													disabled={isSaving}
												>
													<XIcon className='size-3.5' />
												</Button>
											</>
										) : (
											<>
												<span className='flex-1 text-sm font-medium truncate'>
													{cat.name}
												</span>
												<Badge variant='secondary' className='shrink-0 text-xs'>
													{t('label_item_count_badge', { count: cat.itemCount })}
												</Badge>
												<Button
													size='icon'
													variant='ghost'
													className='size-7 shrink-0'
													onClick={() => handleStartRenameCat(cat)}
													disabled={isSaving}
												>
													<PencilIcon className='size-3.5' />
												</Button>
												{cat.itemCount === 0 ? (
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button
																size='icon'
																variant='ghost'
																className='size-7 shrink-0 text-destructive hover:text-destructive'
																disabled={isSaving}
															>
																<TrashIcon className='size-3.5' />
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>{t('label_delete')}</AlertDialogTitle>
																<AlertDialogDescription>
																	{t('label_confirm_cancel_sale')}
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>{t('label_cancel')}</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => handleDeleteCategory(cat.id)}
																>
																	{t('label_delete')}
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												) : (
													<Button
														size='icon'
														variant='ghost'
														className='size-7 shrink-0 text-muted-foreground cursor-not-allowed'
														disabled
														title={t('label_category_has_items', {
															count: cat.itemCount,
														})}
													>
														<TrashIcon className='size-3.5' />
													</Button>
												)}
											</>
										)}
									</div>
								))
							)}
						</div>
					</TabsContent>

					{/* ── BRANDS TAB ─────────────────────────────────── */}
					<TabsContent
						value='brands'
						className='flex flex-col flex-1 min-h-0 mt-0'
					>
						<div className='flex-1 overflow-y-auto min-h-0 px-6 pb-6 space-y-1.5'>
							{brandsLoading ? (
								<div className='flex justify-center py-8'>
									<Spinner className='size-5' />
								</div>
							) : brands.length === 0 ? (
								<p className='text-sm text-muted-foreground py-4 text-center'>
									—
								</p>
							) : (
								brands.map(row => (
									<div
										key={row.brand}
										className='flex items-center gap-2 rounded-md border px-3 py-2'
									>
										{renamingBrand === row.brand ? (
											<>
												<Input
													value={renameBrandValue}
													onChange={e => setRenameBrandValue(e.target.value)}
													className='flex-1 h-7 text-sm'
													autoFocus
													onKeyDown={e => {
														if (e.key === 'Enter') handleConfirmRenameBrand(row.brand)
														if (e.key === 'Escape') setRenamingBrand(null)
													}}
													disabled={isSaving}
												/>
												<Button
													size='icon'
													variant='ghost'
													className='size-7 shrink-0'
													onClick={() => handleConfirmRenameBrand(row.brand)}
													disabled={isSaving || !renameBrandValue.trim()}
												>
													<CheckIcon className='size-3.5' />
												</Button>
												<Button
													size='icon'
													variant='ghost'
													className='size-7 shrink-0'
													onClick={() => setRenamingBrand(null)}
													disabled={isSaving}
												>
													<XIcon className='size-3.5' />
												</Button>
											</>
										) : (
											<>
												<span className='flex-1 text-sm font-medium truncate'>
													{row.brand}
												</span>
												<Badge variant='secondary' className='shrink-0 text-xs'>
													{t('label_item_count_badge', { count: row.itemCount })}
												</Badge>
												<Button
													size='icon'
													variant='ghost'
													className='size-7 shrink-0'
													onClick={() => handleStartRenameBrand(row.brand)}
													disabled={isSaving}
												>
													<PencilIcon className='size-3.5' />
												</Button>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															size='icon'
															variant='ghost'
															className='size-7 shrink-0 text-destructive hover:text-destructive'
															disabled={isSaving}
														>
															<TrashIcon className='size-3.5' />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>{t('label_delete')}</AlertDialogTitle>
															<AlertDialogDescription>
																{t('label_brand_delete_warning', {
																	count: row.itemCount,
																})}
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>{t('label_cancel')}</AlertDialogCancel>
															<AlertDialogAction
																onClick={() => handleDeleteBrand(row.brand, row.itemCount)}
															>
																{t('label_delete')}
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</>
										)}
									</div>
								))
							)}
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
