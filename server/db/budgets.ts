import { CACHE_TAGS } from '@/constants/types'
import { db } from '@/drizzle/db'
import { BudgetsTable, ExpensesTable } from '@/drizzle/schema'
import {
	dbCache,
	getIdTag,
	getParentItemsTag,
	getUserTag,
	revalidateDbCache,
} from '@/lib/cache'
import { and, eq, sum } from 'drizzle-orm'
import { BatchItem } from 'drizzle-orm/batch'

export async function createBudget(data: typeof BudgetsTable.$inferInsert) {
	const [newBudget] = await db
		.insert(BudgetsTable)
		.values(data)
		.returning({ id: BudgetsTable.id, userId: BudgetsTable.clerkUserId })

	revalidateDbCache({
		tag: CACHE_TAGS.budgets,
		id: newBudget.id,
		userId: newBudget.userId,
	})

	return newBudget
}

export async function updateBudget(
	data: Partial<typeof BudgetsTable.$inferInsert>,
	{ id, userId }: { id: string; userId: string }
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
	const res = await db
		.delete(BudgetsTable)
		.where(and(eq(BudgetsTable.id, id), eq(BudgetsTable.clerkUserId, userId)))

	const isDeleted = res.rowCount > 0

	if (isDeleted) {
		revalidateDbCache({
			tag: CACHE_TAGS.budgets,
			id,
			userId,
		})
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
	const cacheFn = dbCache(getBudgetInternal, {
		tags: [
			getIdTag(id, CACHE_TAGS.budgets),
			getParentItemsTag(id, CACHE_TAGS.expenses),
		],
	})

	return await cacheFn({ id, userId })
}

async function getBudgetInternal({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
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
	{ limit }: { limit?: number } = {}
) {
	const cacheFn = dbCache(getBudgetsInternal, {
		tags: [getUserTag(userId, CACHE_TAGS.budgets)],
	})

	return await cacheFn(userId, { limit })
}

async function getBudgetsInternal(
	userId: string,
	{ limit }: { limit?: number } = {}
) {
	return await db.query.BudgetsTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		orderBy: ({ updatedAt }, { desc }) => desc(updatedAt),
		limit,
	})
}

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
		revalidateDbCache({
			tag: CACHE_TAGS.expenses,
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
		revalidateDbCache({
			tag: CACHE_TAGS.expenses,
			id,
			parentId,
		})

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
				revalidateDbCache({
					tag: CACHE_TAGS.expenses,
					id: expense.id,
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

export async function getBudgetExpenses({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const cacheFn = dbCache(getBudgetExpensesInternal, {
		tags: [getParentItemsTag(id, CACHE_TAGS.expenses)],
	})

	return await cacheFn({ id, userId })
}

async function getBudgetExpensesInternal({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const budget = await getBudget({ id, userId })

	if (budget == null) return []

	const data = await db.query.BudgetsTable.findFirst({
		where: ({ id: budgetId }, { eq }) => eq(budgetId, id),
		with: {
			budgetExpenses: {
				where: ({ parentId }, { eq }) => eq(parentId, id),
				orderBy: ({ createdAt }, { desc }) => desc(createdAt),
			},
		},
	})

	return data?.budgetExpenses ?? []
}

async function recalculateBudgetTotals({
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
				and(eq(BudgetsTable.clerkUserId, userId), eq(BudgetsTable.id, parentId))
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
				and(eq(BudgetsTable.clerkUserId, userId), eq(BudgetsTable.id, parentId))
			)

		// 4. Revalidate cache
		revalidateDbCache({
			tag: CACHE_TAGS.budgets,
			id: parentId,
			userId,
		})
	} catch {
		if (expenseId != null) {
			const { rowCount } = await db
				.delete(ExpensesTable)
				.where(eq(ExpensesTable.id, expenseId))

			if (rowCount > 0) {
				revalidateDbCache({
					tag: CACHE_TAGS.expenses,
					id: expenseId,
					parentId,
				})
			}
		}
	}
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
							eq(ExpensesTable.parentId, oldParentId)
						)
					)
			)
		}
	})

	if (statements.length > 0) {
		const rowCount = await db.batch(statements as [BatchItem<'pg'>])
		const isSuccess = rowCount.length > 0

		if (isSuccess) {
			expenses.forEach(expense => {
				revalidateDbCache({
					tag: CACHE_TAGS.expenses,
					id: expense.id,
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
