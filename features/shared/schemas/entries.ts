import { z } from 'zod'
import { getCardBgColorNames } from '@/lib/utils'

const getGenericEntryTypes = (message: string, pastDateMessage?: string) => {
	return z.object({
		name: z.string().min(3, message),
		amount: z.number().nonnegative(message),
		totalQuota: z.number().nonnegative(message),
		totalDebt: z.number().nonnegative(message),
		bgColor: z.enum([...getCardBgColorNames()]),
		isAgainst: z.boolean(),
		dueDate: z.date().refine(
			date => {
				const today = new Date()
				today.setHours(0, 0, 0, 0)
				return date >= today
			},
			{ message: pastDateMessage ?? 'Due date cannot be in the past' }
		),
	})
}

export const getBudgetEntrySchema = (message = 'Required') =>
	getGenericEntryTypes(message).pick({
		name: true,
		totalQuota: true,
		bgColor: true,
	})

export const getLoanEntrySchema = (
	message = 'Required',
	pastDateMessage?: string
) =>
	getGenericEntryTypes(message, pastDateMessage).pick({
		name: true,
		totalDebt: true,
		bgColor: true,
		isAgainst: true,
		dueDate: true,
	})

export const getEntryItemSchema = (message = 'Required') =>
	getGenericEntryTypes(message).pick({
		name: true,
		amount: true,
	})

export const getEntryItemsSchema = (message = 'Required') =>
	z.object({
		items: z.array(
			z.object({
				id: z.string().min(1, message),
				name: z.string().min(3, message),
				amount: z.number().nonnegative(message),
			}),
		),
	})

export const getMoveItemsSchema = ({
	selectParentIdMessage = 'Required',
	selectItemMessage = 'Required',
}) =>
	z.object({
		newParentId: z.string().nonempty({
			message: selectParentIdMessage,
		}),
		items: z.array(z.string()).refine(value => value.some(item => item), {
			message: selectItemMessage,
		}),
	})

export const getAddTodoSchema = (message = 'Required') =>
	z.object({
		name: z.string().min(3, message),
		completed: z.boolean().optional(),
	})
