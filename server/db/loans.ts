import { CACHE_TAGS } from '@/constants/types'
import { db } from '@/drizzle/db'
import { InstallmentsTable, LoansTable } from '@/drizzle/schema'
import {
	dbCache,
	getIdTag,
	getParentItemsTag,
	getUserTag,
	revalidateDbCache,
} from '@/lib/cache'
import { and, eq, sum } from 'drizzle-orm'
import { BatchItem } from 'drizzle-orm/batch'

export async function createLoan(data: typeof LoansTable.$inferInsert) {
	const [newLoan] = await db
		.insert(LoansTable)
		.values(data)
		.returning({ id: LoansTable.id, userId: LoansTable.clerkUserId })

	revalidateDbCache({
		tag: CACHE_TAGS.loans,
		id: newLoan.id,
		userId: newLoan.userId,
	})

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
		revalidateDbCache({
			tag: CACHE_TAGS.loans,
			id,
			userId,
		})
	}

	return isDeleted
}

export async function getLoan({ id, userId }: { id: string; userId: string }) {
	const cacheFn = dbCache(getLoanInternal, {
		tags: [
			getIdTag(id, CACHE_TAGS.loans),
			getParentItemsTag(id, CACHE_TAGS.installments),
		],
	})

	return await cacheFn({ id, userId })
}

async function getLoanInternal({ id, userId }: { id: string; userId: string }) {
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
	const cacheFn = dbCache(getLoansInternal, {
		tags: [getUserTag(userId, CACHE_TAGS.loans)],
	})

	return await cacheFn(userId, { limit })
}

async function getLoansInternal(
	userId: string,
	{ limit }: { limit?: number } = {}
) {
	return await db.query.LoansTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		orderBy: ({ updatedAt }, { desc }) => desc(updatedAt),
		limit,
	})
}

export async function createInstallment(
	data: typeof InstallmentsTable.$inferInsert,
	{ userId }: { userId: string }
) {
	const loan = await getLoan({ id: data.parentId, userId })

	if (loan == null) return null

	const [newInstallment] = await db
		.insert(InstallmentsTable)
		.values(data)
		.returning({
			id: InstallmentsTable.id,
			parentId: InstallmentsTable.parentId,
		})

	if (newInstallment != null) {
		revalidateDbCache({
			tag: CACHE_TAGS.installments,
			id: newInstallment.id,
			parentId: newInstallment.parentId,
		})

		await recalculateLoanTotals({
			parentId: newInstallment.parentId,
			userId,
			installmenId: newInstallment.id,
		})
	}
}

export async function deleteInstallment({
	id,
	parentId,
	userId,
}: {
	id: string
	parentId: string
	userId: string
}) {
	const loan = await getLoan({ id: parentId, userId })

	if (loan == null) return false

	const { rowCount } = await db
		.delete(InstallmentsTable)
		.where(
			and(
				eq(InstallmentsTable.id, id),
				eq(InstallmentsTable.parentId, parentId)
			)
		)

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateDbCache({
			tag: CACHE_TAGS.installments,
			id,
			parentId,
		})

		await recalculateLoanTotals({
			parentId,
			userId,
		})
	}

	return isDeleted
}

export async function updateLoanInstallments(
	installments: (typeof InstallmentsTable.$inferInsert)[],
	{ parentId, userId }: { parentId: string; userId: string }
) {
	const loan = await getLoan({ id: parentId, userId })

	if (loan == null) return false

	const statements: BatchItem<'pg'>[] = []

	if (installments.length > 0) {
		installments.forEach(installment => {
			if (installment.id != null) {
				statements.push(
					db
						.update(InstallmentsTable)
						.set(installment)
						.where(
							and(
								eq(InstallmentsTable.id, installment.id),
								eq(InstallmentsTable.parentId, parentId)
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
			installments.forEach(installment => {
				revalidateDbCache({
					tag: CACHE_TAGS.installments,
					id: installment.id,
					parentId,
				})
			})

			await recalculateLoanTotals({
				parentId,
				userId,
			})
		}

		return isSuccess
	}

	return false
}

export async function getLoanInstallments({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const cacheFn = dbCache(getLoanInstallmentsInternal, {
		tags: [getParentItemsTag(id, CACHE_TAGS.installments)],
	})

	return await cacheFn({ id, userId })
}

async function getLoanInstallmentsInternal({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const loan = await getLoan({ id, userId })

	if (loan == null) return []

	const data = await db.query.LoansTable.findFirst({
		where: ({ id: loanId }, { eq }) => eq(loanId, id),
		with: {
			loanInstallments: {
				where: ({ parentId }, { eq }) => eq(parentId, id),
				orderBy: ({ createdAt }, { desc }) => desc(createdAt),
			},
		},
	})

	return data?.loanInstallments ?? []
}

async function recalculateLoanTotals({
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
		revalidateDbCache({
			tag: CACHE_TAGS.loans,
			id: parentId,
			userId,
		})
	} catch {
		if (installmenId != null) {
			const { rowCount } = await db
				.delete(InstallmentsTable)
				.where(eq(InstallmentsTable.id, installmenId))

			if (rowCount > 0) {
				revalidateDbCache({
					tag: CACHE_TAGS.installments,
					id: installmenId,
					parentId,
				})
			}
		}
	}
}

export async function moveLoanInstallments({
	oldParentId,
	newParentId,
	installments,
	userId,
}: {
	installments: Partial<typeof InstallmentsTable.$inferInsert>[]
	oldParentId: string
	newParentId: string
	userId: string
}) {
	const oldLoan = await getLoan({ id: oldParentId, userId })
	const newLoan = await getLoan({ id: newParentId, userId })

	if (!oldLoan || !newLoan) return false

	const statements: BatchItem<'pg'>[] = []

	installments.forEach(installment => {
		if (installment.id != null) {
			statements.push(
				db
					.update(InstallmentsTable)
					.set({ ...installment, parentId: newParentId })
					.where(
						and(
							eq(InstallmentsTable.id, installment.id),
							eq(InstallmentsTable.parentId, oldParentId)
						)
					)
			)
		}
	})

	if (statements.length > 0) {
		const rowCount = await db.batch(statements as [BatchItem<'pg'>])
		const isSuccess = rowCount.length > 0

		if (isSuccess) {
			installments.forEach(installment => {
				revalidateDbCache({
					tag: CACHE_TAGS.installments,
					id: installment.id,
					parentId: newParentId,
				})
			})

			await recalculateLoanTotals({
				parentId: oldParentId,
				userId,
			})

			await recalculateLoanTotals({
				parentId: newParentId,
				userId,
			})
		}

		return isSuccess
	}

	return false
}
