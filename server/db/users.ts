import { db } from '@/drizzle/db'
import { eq } from 'drizzle-orm'
import { BudgetsTable, LoansTable } from '@/drizzle/schema'
import { revalidateDbCache } from '@/lib/cache'
import { CACHE_TAGS } from '@/constants/types'

export async function deleteUser(clerkUserId: string) {
	const [budgets, loans] = await db.batch([
		db
			.delete(BudgetsTable)
			.where(eq(BudgetsTable.clerkUserId, clerkUserId))
			.returning({
				id: BudgetsTable.id,
			}),
		db
			.delete(LoansTable)
			.where(eq(LoansTable.clerkUserId, clerkUserId))
			.returning({
				id: LoansTable.id,
			}),
	])

	budgets.forEach(budget => {
		revalidateDbCache({
			tag: CACHE_TAGS.budgets,
			id: budget.id,
			userId: clerkUserId,
		})
	})

	loans.forEach(loan => {
		revalidateDbCache({
			tag: CACHE_TAGS.loans,
			id: loan.id,
			userId: clerkUserId,
		})
	})

	return [budgets, loans]
}
