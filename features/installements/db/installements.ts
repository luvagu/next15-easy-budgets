import { db } from '@/drizzle/db'
import { InstallmentsTable } from '@/drizzle/schema'
import { getLoan, recalculateLoanTotals } from '@/features/loans/db/loans'
import { and, eq } from 'drizzle-orm'
import { BatchItem } from 'drizzle-orm/batch'
import { revalidateInstallmentsCache } from './cache'

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
		revalidateInstallmentsCache(newInstallment)

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
		revalidateInstallmentsCache({ id, parentId })

		await recalculateLoanTotals({
			parentId,
			userId,
		})
	}

	return isDeleted
}

export async function updateLoanInstallments(
	installments: Partial<typeof InstallmentsTable.$inferInsert>[],
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
				if (installment.id != null) {
					revalidateInstallmentsCache({
						id: installment.id,
						parentId,
					})
				}
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
