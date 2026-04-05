import { z } from 'zod'

// ─── Inventory Item (Add / Edit) ────────────────────────────────

export const getInventoryItemSchema = (message = 'Required') =>
	z
		.object({
			name: z.string().min(3, message),
			brand: z.string().optional(),
			unit: z.string().min(1, message),
			baseCostUsd: z.number().positive(message),
			profitMarginPct: z.number().min(0).max(1000),
			categoryName: z.string().min(1, message),
			comboQtyThreshold: z.number().int().positive().optional(),
			comboPriceUsd: z.number().positive().optional(),
		})
		.refine(
			data => {
				const hasThreshold = data.comboQtyThreshold != null
				const hasPrice = data.comboPriceUsd != null
				return hasThreshold === hasPrice
			},
			{
				message: 'Both combo fields must be set together',
				path: ['comboPriceUsd'],
			},
		)

export type InventoryItemSchema = ReturnType<typeof getInventoryItemSchema>

// ─── Add Stock ──────────────────────────────────────────────────

export const getAddStockSchema = (message = 'Required') =>
	z.object({
		qty: z.number().int().positive(message),
		costPerUnit: z.number().positive(message),
	})

export type AddStockSchema = ReturnType<typeof getAddStockSchema>

// ─── Register Sale (Invoice) ────────────────────────────────────

export const getSaleInvoiceSchema = (message = 'Required') =>
	z
		.object({
			customerName: z.string().min(1, message),
			deliveryChargeUsd: z.number().nonnegative(),
			isCreditSale: z.boolean(),
			paymentDueDate: z.date().optional(),
			items: z
				.array(
					z.object({
						itemId: z.string().uuid(),
						qty: z.number().int().positive(message),
					}),
				)
				.min(1, 'At least one item required'),
		})
		.superRefine((data, ctx) => {
			if (data.isCreditSale && !data.paymentDueDate) {
				ctx.addIssue({
					code: 'custom',
					message,
					path: ['paymentDueDate'],
				})
			}
		})

export type SaleInvoiceSchema = ReturnType<typeof getSaleInvoiceSchema>

// ─── Bulk Upload Row ────────────────────────────────────────────

export const getBulkUploadRowSchema = (message = 'Required') =>
	z.object({
		name: z.string().min(1, message),
		brand: z.string().optional(),
		category: z.string().min(1, message),
		unit: z.string().min(1, message),
		cost: z.number().positive(message),
		stock: z.number().int().nonnegative().default(0),
		margin: z.number().min(0).max(1000).default(30),
	})

export const getBulkUploadSchema = (message = 'Required') =>
	z.array(getBulkUploadRowSchema(message)).min(1, 'At least one row required')
