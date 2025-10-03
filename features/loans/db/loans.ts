import { db } from '@/drizzle/db'
import { InstallmentsTable, LoansTable } from '@/drizzle/schema'
import { and, eq, sum } from 'drizzle-orm'
import {
	getLoanIdTag,
	getLoansGlobalTag,
	getUserLoansTag,
	revalidateLoansCache,
} from './cache'
import {
	getLoanInstallmentsTag,
	revalidateInstallmentsCache,
} from '@/features/installements/db/cache'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'

export async function createLoan(data: typeof LoansTable.$inferInsert) {
	const [newLoan] = await db
		.insert(LoansTable)
		.values(data)
		.returning({ id: LoansTable.id, userId: LoansTable.clerkUserId })

	revalidateLoansCache(newLoan)

	return newLoan
}

export async function updateLoan(
	data: Partial<typeof LoansTable.$inferInsert>,
	{ id, userId }: { id: string; userId: string }
) {
	const { rowCount } = await db
		.update(LoansTable)
		.set(data)
		.where(and(eq(LoansTable.clerkUserId, userId), eq(LoansTable.id, id)))

	const isSuccess = rowCount > 0

	if (isSuccess) {
		await recalculateLoanTotals({
			parentId: id,
			userId,
		})
	}

	return isSuccess
}

export async function deleteLoan({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const { rowCount } = await db
		.delete(LoansTable)
		.where(and(eq(LoansTable.id, id), eq(LoansTable.clerkUserId, userId)))

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateLoansCache({
			id,
			userId,
		})
	}

	return isDeleted
}

export async function getLoan({ id, userId }: { id: string; userId: string }) {
	'use cache'

	cacheTag(getLoanIdTag(id), getLoanInstallmentsTag(id))

	return await db.query.LoansTable.findFirst({
		columns: {
			id: true,
			name: true,
			bgColor: true,
			totalDebt: true,
			installmensTotal: true,
			dueAmount: true,
			isAgainst: true,
		},
		where: ({ clerkUserId, id: loanId }, { and, eq }) =>
			and(eq(clerkUserId, userId), eq(loanId, id)),
		with: {
			loanInstallments: {
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

export async function getLoans(
	userId: string,
	{ limit }: { limit?: number } = {}
) {
	'use cache'

	cacheTag(getLoansGlobalTag(), getUserLoansTag(userId))

	return await db.query.LoansTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		orderBy: ({ createdAt }, { desc }) => desc(createdAt),
		limit,
	})
}

export async function recalculateLoanTotals({
	parentId,
	userId,
	installmenId,
}: {
	parentId: string
	userId: string
	installmenId?: string
}) {
	try {
		// 1. Recalculate installmentsTotal for the parent loan
		const [{ total }] = await db
			.select({ total: sum(InstallmentsTable.amount) })
			.from(InstallmentsTable)
			.where(and(eq(InstallmentsTable.parentId, parentId)))

		const installmensTotal = Number(total) ?? 0

		// 2. Get the loan's totalDebt
		const [loan] = await db
			.select({ totalDebt: LoansTable.totalDebt })
			.from(LoansTable)
			.where(
				and(eq(LoansTable.clerkUserId, userId), eq(LoansTable.id, parentId))
			)

		const dueAmount = (loan?.totalDebt ?? 0) - installmensTotal

		// 3. Update the loan
		await db
			.update(LoansTable)
			.set({
				installmensTotal,
				dueAmount,
			})
			.where(
				and(eq(LoansTable.clerkUserId, userId), eq(LoansTable.id, parentId))
			)

		// 4. Revalidate cache
		revalidateLoansCache({ id: parentId, userId })
	} catch {
		if (installmenId != null) {
			const { rowCount } = await db
				.delete(InstallmentsTable)
				.where(eq(InstallmentsTable.id, installmenId))

			if (rowCount > 0) {
				revalidateInstallmentsCache({
					id: installmenId,
					parentId,
				})
			}
		}
	}
}
