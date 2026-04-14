'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	CheckCircleIcon,
	AlertTriangleIcon,
	XCircleIcon,
	CopyIcon,
	UploadIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { validateBulkUpload, processBulkUpload } from '../actions/items'
import type { BulkUploadRowResolution } from '../types/inventory'

type Step = 'paste' | 'review' | 'done'

type ParsedRow = {
	name: string
	brand?: string
	category: string
	unit: string
	cost: number
	stock: number
	margin: number
}

type ValidationResult = {
	rowIndex: number
	status: 'new' | 'exact_match' | 'fuzzy_match' | 'error'
	exactMatch?: {
		id: string
		name: string
		brand: string | null
		stockQty: number
		baseCostUsd: number
	}
	fuzzyMatches?: {
		id: string
		name: string
		brand: string | null
		stockQty: number
		baseCostUsd: number
	}[]
	error?: string
}

interface BulkUploadDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}

const SAMPLE_TSV = `name\tbrand\tcategory\tunit\tcost\tstock\tmargin
Chicken Breast\tPerdue\tMeats\tkg\t3.50\t20\t30
Whole Milk\tOrganic Valley\tDairy\tliter\t1.20\t50\t25`

export function BulkUploadDialog({
	open,
	onOpenChange,
	onSuccess,
}: BulkUploadDialogProps) {
	const t = useTranslations('inventory')
	const [step, setStep] = useState<Step>('paste')
	const [rawText, setRawText] = useState('')
	const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
	const [validationResults, setValidationResults] = useState<
		ValidationResult[]
	>([])
	const [resolutions, setResolutions] = useState<
		Record<number, BulkUploadRowResolution>
	>({})
	const [isValidating, startValidating] = useTransition()
	const [isProcessing, startProcessing] = useTransition()

	const resetState = () => {
		setStep('paste')
		setRawText('')
		setParsedRows([])
		setValidationResults([])
		setResolutions({})
	}

	const handleParse = () => {
		// Simple TSV parser — avoids PapaParse quoting/escaping logic that
		// chokes on Latin/special characters (ñ, á, etc.) in field values.
		// TSV fields are never quoted, so splitting on \t is always safe.
		const normalized = rawText
			.replace(/^\uFEFF/, '') // strip BOM
			.replace(/\r\n/g, '\n') // CRLF → LF
			.replace(/\r/g, '\n') // bare CR → LF

		const lines = normalized.split('\n').filter(l => l.trim().length > 0)

		if (lines.length < 2) {
			toast.error(t('error_no_data_rows'))
			return
		}

		const headers = lines[0].split('\t').map(h => h.trim().toLowerCase())
		const dataLines = lines.slice(1)

		const rawRows: Record<string, string>[] = dataLines.map(line => {
			const cols = line.split('\t')
			return Object.fromEntries(
				headers.map((h, i) => [h, (cols[i] ?? '').trim()]),
			)
		})

		if (rawRows.length === 0) {
			toast.error(t('error_no_data_rows'))
			return
		}

		const rows: ParsedRow[] = rawRows.map(row => ({
			name: row.name?.trim() ?? '',
			brand: row.brand?.trim() || undefined,
			category: row.category?.trim() ?? '',
			unit: row.unit?.trim() ?? '',
			cost: parseFloat(row.cost) || 0,
			stock: parseInt(row.stock) || 0,
			margin: parseFloat(row.margin) || 30,
		}))

		setParsedRows(rows)

		// Validate server-side
		startValidating(async () => {
			const result = await validateBulkUpload(rows)
			if (result.error) {
				toast.error(result.message)
				return
			}

			setValidationResults(result.results)

			// Auto-set default resolutions
			const defaults: Record<number, BulkUploadRowResolution> = {}
			for (const r of result.results) {
				if (r.status === 'new') {
					defaults[r.rowIndex] = { action: 'create' }
				} else if (r.status === 'exact_match' && r.exactMatch) {
					defaults[r.rowIndex] = {
						action: 'merge',
						mergeWithItemId: r.exactMatch.id,
					}
				} else if (r.status === 'fuzzy_match') {
					defaults[r.rowIndex] = { action: 'skip' }
				} else if (r.status === 'error') {
					defaults[r.rowIndex] = { action: 'skip' }
				}
			}
			setResolutions(defaults)
			setStep('review')
		})
	}

	const handleProcess = () => {
		startProcessing(async () => {
			const result = await processBulkUpload({
				rows: parsedRows,
				resolutions,
			})
			if (result.error) {
				toast.error(result.message)
			} else {
				toast.success(result.message)
				setStep('done')
				onSuccess()
			}
		})
	}

	const handleClose = () => {
		resetState()
		onOpenChange(false)
	}

	const statusIcon = (status: ValidationResult['status']) => {
		switch (status) {
			case 'new':
				return <CheckCircleIcon className='size-4 text-green-500' />
			case 'exact_match':
				return <AlertTriangleIcon className='size-4 text-amber-500' />
			case 'fuzzy_match':
				return <AlertTriangleIcon className='size-4 text-orange-500' />
			case 'error':
				return <XCircleIcon className='size-4 text-destructive' />
		}
	}

	const statusLabel = (status: ValidationResult['status']) => {
		switch (status) {
			case 'new':
				return (
					<Badge variant='outline' className='border-green-500 text-green-600'>
						{t('label_status_new')}
					</Badge>
				)
			case 'exact_match':
				return (
					<Badge variant='outline' className='border-amber-500 text-amber-600'>
						{t('label_status_exact')}
					</Badge>
				)
			case 'fuzzy_match':
				return (
					<Badge
						variant='outline'
						className='border-orange-500 text-orange-600'
					>
						{t('label_status_fuzzy')}
					</Badge>
				)
			case 'error':
				return <Badge variant='destructive'>{t('label_status_error')}</Badge>
		}
	}

	const AI_PROMPT = t('dialog_bulk_ai_prompt')

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			{/*
			 * grid-rows-[auto_1fr_auto] + overflow-hidden + max-h-[90dvh]:
			 *   row 1 → DialogHeader (shrinks to content)
			 *   row 2 → scrollable body (grows to fill remaining height)
			 *   row 3 → footer (always visible at bottom)
			 */}
			<DialogContent className='flex flex-col sm:max-w-3xl max-h-[90dvh] overflow-hidden gap-0 p-0'>
				<DialogHeader className='px-6 pt-6 pb-4 shrink-0'>
					<DialogTitle>{t('dialog_bulk_title')}</DialogTitle>
					<DialogDescription>
						{step === 'paste' && t('dialog_bulk_paste_desc')}
						{step === 'review' && t('dialog_bulk_review_desc')}
						{step === 'done' && t('dialog_bulk_done_desc')}
					</DialogDescription>
				</DialogHeader>

				{/* ─── Step 1: Paste ─────────────────────────── */}
				{step === 'paste' && (
					<>
						<div className='flex-1 overflow-y-auto min-h-0 px-6 space-y-3 pb-2'>
							{/* AI Prompt Helper */}
							<div className='rounded-md border bg-muted/50 p-3'>
								<div className='mb-2 flex items-center justify-between'>
									<span className='flex items-center gap-2 text-sm font-medium text-foreground'>
										✨ {t('label_ai_generate')}
									</span>
									<Button
										type='button'
										variant='ghost'
										size='sm'
										className='h-auto px-2 text-xs'
										onClick={() => {
											navigator.clipboard.writeText(AI_PROMPT)
											toast.success(t('toast_prompt_copied'))
										}}
									>
										<CopyIcon className='mr-1.5 size-3' />
										{t('label_copy_prompt')}
									</Button>
								</div>
								<p className='rounded border bg-background p-2 font-mono text-xs text-muted-foreground line-clamp-2'>
									{AI_PROMPT}
								</p>
							</div>
							<Textarea
								placeholder={t('dialog_bulk_paste_desc')}
								className='font-mono text-xs min-h-40 resize-none'
								value={rawText}
								onChange={e => setRawText(e.target.value)}
							/>
							<div className='flex items-center gap-2'>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => {
										setRawText(SAMPLE_TSV)
										toast.info(t('toast_sample_loaded'))
									}}
								>
									<CopyIcon className='size-3.5' />
									{t('label_load_sample')}
								</Button>
								<p className='text-xs text-muted-foreground'>
									{t('label_paste_tip')}
								</p>
							</div>
						</div>
						<div className='px-6 py-4 border-t shrink-0'>
							<DialogFooter>
								<Button type='button' variant='outline' onClick={handleClose}>
									{t('label_cancel')}
								</Button>
								<Button
									type='button'
									disabled={rawText.trim().length === 0 || isValidating}
									onClick={handleParse}
								>
									{isValidating && <Spinner className='size-4' />}
									{t('label_validate')}
								</Button>
							</DialogFooter>
						</div>
					</>
				)}

				{/* ─── Step 2: Review ────────────────────────── */}
				{step === 'review' && (
					<>
						<div className='flex-1 overflow-y-auto min-h-0 px-6 space-y-3 pb-2'>
							<div className='rounded-md border overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='w-8'>#</TableHead>
											<TableHead className='min-w-[130px]'>
												{t('col_status')}
											</TableHead>
											<TableHead className='min-w-[140px]'>
												{t('label_name')}
											</TableHead>
											<TableHead className='min-w-[80px]'>
												{t('label_brand')}
											</TableHead>
											<TableHead className='min-w-[90px]'>
												{t('label_category')}
											</TableHead>
											<TableHead className='min-w-[70px]'>
												{t('label_cost_usd')}
											</TableHead>
											<TableHead className='w-14'>{t('col_stock')}</TableHead>
											<TableHead className='min-w-[100px]'>
												{t('col_action')}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{validationResults.map(vr => {
											const row = parsedRows[vr.rowIndex]
											const resolution = resolutions[vr.rowIndex]

											return (
												<TableRow key={vr.rowIndex}>
													<TableCell className='text-muted-foreground'>
														{vr.rowIndex + 1}
													</TableCell>
													<TableCell>
														<div className='flex items-center gap-1.5'>
															{statusIcon(vr.status)}
															{statusLabel(vr.status)}
														</div>
														{vr.status === 'exact_match' && vr.exactMatch && (
															<p className='text-[10px] text-muted-foreground mt-0.5'>
																{t('label_match')}: {vr.exactMatch.name}
																{vr.exactMatch.brand
																	? ` (${vr.exactMatch.brand})`
																	: ''}{' '}
																— {t('col_stock')}: {vr.exactMatch.stockQty},{' '}
																{t('col_cost')}: $
																{vr.exactMatch.baseCostUsd.toFixed(2)}
															</p>
														)}
														{vr.status === 'fuzzy_match' && vr.fuzzyMatches && (
															<p className='text-[10px] text-muted-foreground mt-0.5'>
																{t('label_similar')}:{' '}
																{vr.fuzzyMatches.map(f => f.name).join(', ')}
															</p>
														)}
														{vr.status === 'error' && (
															<p className='text-[10px] text-destructive mt-0.5'>
																{vr.error}
															</p>
														)}
													</TableCell>
													<TableCell className='font-medium'>
														{row.name}
													</TableCell>
													<TableCell className='text-muted-foreground'>
														{row.brand || '—'}
													</TableCell>
													<TableCell>{row.category}</TableCell>
													<TableCell className='tabular-nums'>
														${row.cost.toFixed(2)}
													</TableCell>
													<TableCell className='tabular-nums'>
														{row.stock}
													</TableCell>
													<TableCell>
														{vr.status === 'error' ? (
															<span className='text-xs text-muted-foreground'>
																{t('label_bulk_skip')}
															</span>
														) : (
															<Select
																value={resolution?.action ?? 'skip'}
																onValueChange={val => {
																	const newRes = { ...resolutions }
																	if (val === 'merge') {
																		const mergeId =
																			vr.exactMatch?.id ??
																			vr.fuzzyMatches?.[0]?.id
																		if (mergeId) {
																			newRes[vr.rowIndex] = {
																				action: 'merge',
																				mergeWithItemId: mergeId,
																			}
																		}
																	} else if (val === 'create') {
																		newRes[vr.rowIndex] = { action: 'create' }
																	} else {
																		newRes[vr.rowIndex] = { action: 'skip' }
																	}
																	setResolutions(newRes)
																}}
															>
																<SelectTrigger className='h-7 w-24 text-xs'>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value='create'>
																		{t('label_bulk_create')}
																	</SelectItem>
																	{(vr.status === 'exact_match' ||
																		vr.status === 'fuzzy_match') && (
																		<SelectItem value='merge'>
																			{t('label_bulk_merge')}
																		</SelectItem>
																	)}
																	<SelectItem value='skip'>
																		{t('label_bulk_skip')}
																	</SelectItem>
																</SelectContent>
															</Select>
														)}
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							</div>

							{/* Summary */}
							<div className='flex gap-3 text-xs text-muted-foreground'>
								<span>
									{t('label_bulk_create')}:{' '}
									{
										Object.values(resolutions).filter(
											r => r.action === 'create',
										).length
									}
								</span>
								<span>
									{t('label_bulk_merge')}:{' '}
									{
										Object.values(resolutions).filter(r => r.action === 'merge')
											.length
									}
								</span>
								<span>
									{t('label_bulk_skip')}:{' '}
									{
										Object.values(resolutions).filter(r => r.action === 'skip')
											.length
									}
								</span>
							</div>
						</div>
						<div className='px-6 py-4 border-t shrink-0'>
							<DialogFooter>
								<Button
									type='button'
									variant='outline'
									onClick={() => setStep('paste')}
								>
									{t('label_back')}
								</Button>
								<Button
									type='button'
									disabled={isProcessing}
									onClick={handleProcess}
								>
									{isProcessing && <Spinner className='size-4' />}
									<UploadIcon className='size-3.5' />
									{t('label_import')}
								</Button>
							</DialogFooter>
						</div>
					</>
				)}

				{/* ─── Step 3: Done ──────────────────────────── */}
				{step === 'done' && (
					<div className='flex flex-col flex-1 items-center justify-center gap-4 px-6 py-10 text-center'>
						<CheckCircleIcon className='size-12 text-green-500' />
						<p className='text-sm text-muted-foreground'>
							{t('label_bulk_done_msg')}
						</p>
						<Button type='button' onClick={handleClose}>
							{t('label_close')}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
