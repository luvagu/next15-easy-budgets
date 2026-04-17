import { db } from '@/drizzle/db'
import { InstallmentsTable, LoansTable } from '@/drizzle/schema'
import { and, eq, sum } from 'drizzle-orm'
import {
	getLoanIdTag,
	getLoanInstallmentsTag,
	getLoansGlobalTag,
	getUserLoansTag,
	revalidateInstallmentsCache,
	revalidateLoansCache,
} from './cache'
import { cacheTag } from 'next/cache'
import { BatchItem } from 'drizzle-orm/batch'
import { INVOICE_NUM_PREFIX } from '@/features/inventory/constants/constants'
import { normalizeEntryName } from '@/lib/utils'

export async function createLoan(data: typeof LoansTable.$inferInsert) {
	let name = data.name
	name = name.startsWith(INVOICE_NUM_PREFIX) // means it belongs to inventory sales
		? name
		: normalizeEntryName(name)

	const [newLoan] = await db
		.insert(LoansTable)
		.values({ ...data, name, dueAmount: data.totalDebt })
		.returning({ id: LoansTable.id, userId: LoansTable.clerkUserId })

	revalidateLoansCache(newLoan)

	return newLoan
}

export async function updateLoan(
	data: Partial<typeof LoansTable.$inferInsert>,
	{ id, userId }: { id: string; userId: string },
) {
	let name = data.name

	if (name) {
		name = name.startsWith(INVOICE_NUM_PREFIX) // means it belongs to inventory sales
			? name
			: normalizeEntryName(name)
	}

	const { rowCount } = await db
		.update(LoansTable)
		.set({ ...data, ...(name && { name }) })
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
			dueDate: true,
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
	{ limit }: { limit?: number } = {},
) {
	'use cache'

	cacheTag(getLoansGlobalTag(), getUserLoansTag(userId))

	return await db.query.LoansTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		orderBy: ({ updatedAt }, { desc }) => desc(updatedAt),
		limit,
	})
}

export async function createInstallment(
	data: typeof InstallmentsTable.$inferInsert,
	{ userId }: { userId: string },
) {
	const loan = await getLoan({ id: data.parentId, userId })

	if (loan == null) return null

	const [newInstallment] = await db
		.insert(InstallmentsTable)
		.values({ ...data, name: normalizeEntryName(data.name) })
		.returning({
			id: InstallmentsTable.id,
			parentId: InstallmentsTable.parentId,
		})

	if (newInstallment != null) {
		revalidateInstallmentsCache({
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
				eq(InstallmentsTable.parentId, parentId),
			),
		)

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateInstallmentsCache({ id, parentId })

		await recalculateLoanTotals({
			parentId,
			userId,
		})
	}

	return isDeleted
}

export async function updateLoanInstallments(
	installments: (typeof InstallmentsTable.$inferInsert)[],
	{ parentId, userId }: { parentId: string; userId: string },
) {
	const loan = await getLoan({ id: parentId, userId })

	if (loan == null) return false

	const statements: BatchItem<'pg'>[] = []

	if (installments.length > 0) {
		installments.forEach(installment => {
			if (installment.id != null) {
				let name = installment.name

				if (name) {
					name = normalizeEntryName(name)
				}

				statements.push(
					db
						.update(InstallmentsTable)
						.set({ ...installment, ...(name && { name }) })
						.where(
							and(
								eq(InstallmentsTable.id, installment.id),
								eq(InstallmentsTable.parentId, parentId),
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
			installments.forEach(installment => {
				revalidateInstallmentsCache({
					id: installment.id!,
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
							eq(InstallmentsTable.parentId, oldParentId),
						),
					),
			)
		}
	})

	if (statements.length > 0) {
		const rowCount = await db.batch(statements as [BatchItem<'pg'>])
		const isSuccess = rowCount.length > 0

		if (isSuccess) {
			installments.forEach(installment => {
				revalidateInstallmentsCache({
					id: installment.id!,
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
				and(eq(LoansTable.clerkUserId, userId), eq(LoansTable.id, parentId)),
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
				and(eq(LoansTable.clerkUserId, userId), eq(LoansTable.id, parentId)),
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
