import { getBudgets } from '@/server/db/budgets'
import { getLoans } from '@/server/db/loans'
import { auth } from '@clerk/nextjs/server'
import { getTodos } from '@/server/db/todos'
import { DashboardPageClient } from './_components/DashboardPageClient'
import { getItemsCount } from '@/features/inventory/db/items'

export default async function DashboardPage() {
	const { userId, redirectToSignIn } = await auth()

	if (userId == null) {
		return redirectToSignIn()
	}

	const [budgets, loans, todosLis, inventoryItemCount] = await Promise.all([
		getBudgets(userId),
		getLoans(userId),
		getTodos(userId),
		getItemsCount(userId),
	])

	return (
		<DashboardPageClient
			budgets={budgets}
			loans={loans}
			todosLis={todosLis}
			inventoryItemCount={inventoryItemCount}
		/>
	)
}
