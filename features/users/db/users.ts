import { db } from '@/drizzle/db'
import { eq } from 'drizzle-orm'
import { BudgetsTable, LoansTable } from '@/drizzle/schema'
import { revalidateUsersCache } from './cache'
import { revalidateBudgetsCache } from '@/features/budgets/db/cache'
import { revalidateLoansCache } from '@/features/loans/db/cache'

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
		revalidateBudgetsCache({ id: budget.id, userId: clerkUserId })
	})

	loans.forEach(loan => {
		revalidateLoansCache({ id: loan.id, userId: clerkUserId })
	})

	revalidateUsersCache(clerkUserId)

	return [budgets, loans]
}
