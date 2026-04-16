import { db } from '@/drizzle/db'
import { BudgetsTable, ExpensesTable } from '@/drizzle/schema'
import { and, eq, sum } from 'drizzle-orm'
import { cacheTag } from 'next/cache'
import {
	getBudgetExpensesTag,
	getBudgetIdTag,
	getBudgetsGlobalTag,
	getUserBudgetsTag,
	revalidateBudgetsCache,
	revalidateExpensesCache,
} from './cache'
import { BatchItem } from 'drizzle-orm/batch'

export async function createBudget(data: typeof BudgetsTable.$inferInsert) {
	const [newBudget] = await db
		.insert(BudgetsTable)
		.values({ ...data, availableQuota: data.totalQuota })
		.returning({ id: BudgetsTable.id, userId: BudgetsTable.clerkUserId })

	revalidateBudgetsCache(newBudget)

	return newBudget
}

export async function updateBudget(
	data: Partial<typeof BudgetsTable.$inferInsert>,
	{ id, userId }: { id: string; userId: string },
) {
	const { rowCount } = await db
		.update(BudgetsTable)
		.set(data)
		.where(and(eq(BudgetsTable.clerkUserId, userId), eq(BudgetsTable.id, id)))

	const isSuccess = rowCount > 0

	if (isSuccess) {
		await recalculateBudgetTotals({
			parentId: id,
			userId,
		})
	}

	return isSuccess
}

export async function deleteBudget({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const { rowCount } = await db
		.delete(BudgetsTable)
		.where(and(eq(BudgetsTable.id, id), eq(BudgetsTable.clerkUserId, userId)))

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateBudgetsCache({ id, userId })
	}

	return isDeleted
}

export async function getBudget({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	'use cache'

	cacheTag(getBudgetIdTag(id), getBudgetExpensesTag(id))

	return await db.query.BudgetsTable.findFirst({
		columns: {
			id: true,
			name: true,
			bgColor: true,
			totalQuota: true,
			expensesTotal: true,
			availableQuota: true,
		},
		where: ({ clerkUserId, id: budgetId }, { and, eq }) =>
			and(eq(clerkUserId, userId), eq(budgetId, id)),
		with: {
			budgetExpenses: {
				columns: {
					id: true,
					parentId: true,
					name: true,
					amount: true,
					createdAt: true,
				},
				where: ({ parentId }, { eq }) => eq(parentId, id),
				orderBy: ({ createdAt }, { desc }) => desc(createdAt),
			},
		},
	})
}

export async function getBudgets(
	userId: string,
	{ limit }: { limit?: number } = {},
) {
	'use cache'

	cacheTag(getBudgetsGlobalTag(), getUserBudgetsTag(userId))

	return await db.query.BudgetsTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		orderBy: ({ updatedAt }, { desc }) => desc(updatedAt),
		limit,
	})
}

export async function createExpense(
	data: typeof ExpensesTable.$inferInsert,
	{ userId }: { userId: string },
) {
	const budget = await getBudget({ id: data.parentId, userId })

	if (budget == null) return null

	const [newExpense] = await db
		.insert(ExpensesTable)
		.values(data)
		.returning({ id: ExpensesTable.id, parentId: ExpensesTable.parentId })

	if (newExpense != null) {
		revalidateExpensesCache({
			id: newExpense.id,
			parentId: newExpense.parentId,
		})

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
	{ parentId, userId }: { parentId: string; userId: string },
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
								eq(ExpensesTable.parentId, parentId),
							),
						),
				)
			}
		})
	}

	if (statements.length > 0) {
		const rowCount = await db.batch(statements as [BatchItem<'pg'>])
		const isSuccess = rowCount.length > 0

		if (isSuccess) {
			expenses.forEach(expense => {
				revalidateExpensesCache({
					id: expense.id!,
					parentId,
				})
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

export async function moveBudgetExpenses({
	oldParentId,
	newParentId,
	expenses,
	userId,
}: {
	expenses: Partial<typeof ExpensesTable.$inferInsert>[]
	oldParentId: string
	newParentId: string
	userId: string
}) {
	const oldBudget = await getBudget({ id: oldParentId, userId })
	const newBudget = await getBudget({ id: newParentId, userId })

	if (!oldBudget || !newBudget) return false

	const statements: BatchItem<'pg'>[] = []

	expenses.forEach(expense => {
		if (expense.id != null) {
			statements.push(
				db
					.update(ExpensesTable)
					.set({ ...expense, parentId: newParentId })
					.where(
						and(
							eq(ExpensesTable.id, expense.id),
							eq(ExpensesTable.parentId, oldParentId),
						),
					),
			)
		}
	})

	if (statements.length > 0) {
		const rowCount = await db.batch(statements as [BatchItem<'pg'>])
		const isSuccess = rowCount.length > 0

		if (isSuccess) {
			expenses.forEach(expense => {
				revalidateExpensesCache({
					id: expense.id!,
					parentId: newParentId,
				})
			})

			await recalculateBudgetTotals({
				parentId: oldParentId,
				userId,
			})

			await recalculateBudgetTotals({
				parentId: newParentId,
				userId,
			})
		}

		return isSuccess
	}

	return false
}

export async function recalculateBudgetTotals({
	parentId,
	userId,
	expenseId,
}: {
	parentId: string
	userId: string
	expenseId?: string
}) {
	try {
		// 1. Recalculate expensesTotal for the parent budget
		const [{ total }] = await db
			.select({ total: sum(ExpensesTable.amount) })
			.from(ExpensesTable)
			.where(and(eq(ExpensesTable.parentId, parentId)))

		const expensesTotal = Number(total) ?? 0

		// 2. Get the budget's totalQuota
		const [budget] = await db
			.select({ totalQuota: BudgetsTable.totalQuota })
			.from(BudgetsTable)
			.where(
				and(
					eq(BudgetsTable.clerkUserId, userId),
					eq(BudgetsTable.id, parentId),
				),
			)

		const availableQuota = (budget?.totalQuota ?? 0) - expensesTotal

		// 3. Update the budget
		await db
			.update(BudgetsTable)
			.set({
				expensesTotal,
				availableQuota,
			})
			.where(
				and(
					eq(BudgetsTable.clerkUserId, userId),
					eq(BudgetsTable.id, parentId),
				),
			)

		// 4. Revalidate cache
		revalidateBudgetsCache({ id: parentId, userId })
	} catch {
		if (expenseId != null) {
			const { rowCount } = await db
				.delete(ExpensesTable)
				.where(eq(ExpensesTable.id, expenseId))

			if (rowCount > 0) {
				revalidateExpensesCache({
					id: expenseId,
					parentId,
				})
			}
		}
	}
}
