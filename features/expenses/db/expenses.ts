import { db } from '@/drizzle/db'
import { ExpensesTable } from '@/drizzle/schema'
import {
	getBudget,
	recalculateBudgetTotals,
} from '@/features/budgets/db/budgets'
import { BatchItem } from 'drizzle-orm/batch'
import { revalidateExpensesCache } from './cache'
import { and, eq } from 'drizzle-orm'

export async function createExpense(
	data: typeof ExpensesTable.$inferInsert,
	{ userId }: { userId: string }
) {
	const budget = await getBudget({ id: data.parentId, userId })

	if (budget == null) return null

	const [newExpense] = await db
		.insert(ExpensesTable)
		.values(data)
		.returning({ id: ExpensesTable.id, parentId: ExpensesTable.parentId })

	if (newExpense != null) {
		revalidateExpensesCache(newExpense)

		await recalculateBudgetTotals({
			parentId: newExpense.parentId,
			userId,
			expenseId: newExpense.id,
		})
	}
}

export async function deleteExpense({
	id,
	parentId,
	userId,
}: {
	id: string
	parentId: string
	userId: string
}) {
	const budget = await getBudget({ id: parentId, userId })

	if (budget == null) return false

	const { rowCount } = await db
		.delete(ExpensesTable)
		.where(and(eq(ExpensesTable.id, id), eq(ExpensesTable.parentId, parentId)))

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateExpensesCache({ id, parentId })

		await recalculateBudgetTotals({
			parentId,
			userId,
		})
	}

	return isDeleted
}

export async function updateBudgetExpenses(
	expenses: Partial<typeof ExpensesTable.$inferInsert>[],
	{ parentId, userId }: { parentId: string; userId: string }
) {
	const budget = await getBudget({ id: parentId, userId })

	if (budget == null) return false

	const statements: BatchItem<'pg'>[] = []

	if (expenses.length > 0) {
		expenses.forEach(expense => {
			if (expense.id != null) {
				statements.push(
					db
						.update(ExpensesTable)
						.set(expense)
						.where(
							and(
								eq(ExpensesTable.id, expense.id),
								eq(ExpensesTable.parentId, parentId)
							)
						)
				)
			}
		})
	}

	if (statements.length > 0) {
		const rowCount = await db.batch(statements as [BatchItem<'pg'>])
		const isSuccess = rowCount.length > 0

		if (isSuccess) {
			expenses.forEach(expense => {
				if (expense.id != null) {
					revalidateExpensesCache({
						id: expense.id,
						parentId,
					})
				}
			})

			await recalculateBudgetTotals({
				parentId,
				userId,
			})
		}

		return isSuccess
	}

	return false
}
