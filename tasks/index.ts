/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '@/drizzle/db'
import {
	BudgetsTable,
	ExpensesTable,
	InstallmentsTable,
	LoansTable,
} from '@/drizzle/schema'
import { and, eq, sum } from 'drizzle-orm'
import { BatchItem } from 'drizzle-orm/batch'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ...existing code for DB connection...
export async function populateJSONDatInDB() {
	const raw = await readFile(`${__dirname}/mock/henni/data.json`, 'utf-8')
	const data = JSON.parse(raw)

	// Step 1: Filter and map budgets and loans
	const defaultBudgets = data.budgets
		.filter((b: any) => b.type === 'default')
		.map((b: any) => ({
			name: b.name,
			totalQuota: b.max,
			bgColor: b.bgColor,
			clerkUserId: b.user,
			// We'll let DB handle id, createdAt, updatedAt
		}))

	const defaultLoans = data.budgets
		.filter((l: any) => l.type === 'loan')
		.map((l: any) => ({
			name: l.name,
			totalDebt: l.max,
			bgColor: l.bgColor,
			isAgainst: false,
			clerkUserId: l.user,
			// We'll let DB handle id, createdAt, updatedAt
		}))

	// Insert budgets and loans and keep mapping of oldId to newId
	const budgetStatements: BatchItem<'pg'>[] = []
	const loanStatements: BatchItem<'pg'>[] = []

	for (const b of defaultBudgets) {
		budgetStatements.push(
			db
				.insert(BudgetsTable)
				.values(b)
				.returning({ id: BudgetsTable.id, name: BudgetsTable.name })
		)
	}

	for (const l of defaultLoans) {
		loanStatements.push(
			db
				.insert(LoansTable)
				.values(l)
				.returning({ id: LoansTable.id, name: LoansTable.name })
		)
	}

	let insertedBudgets

	if (budgetStatements.length > 0) {
		insertedBudgets = await db.batch(budgetStatements as [BatchItem<'pg'>])
	}

	let insertedLoans

	if (loanStatements.length > 0) {
		insertedLoans = await db.batch(loanStatements as [BatchItem<'pg'>])
	}

	// Map old budget and loan name to new id (assuming name is unique in old data)
	const budgetNameToId =
		insertedBudgets &&
		Object.fromEntries(insertedBudgets.map(b => [b[0].name, b[0].id]))

	const loanNameToId =
		insertedLoans &&
		Object.fromEntries(insertedLoans.map(l => [l[0].name, l[0].id]))

	// Step 2: Filter and map expenses and installemnts
	const defaultExpenses = data.expenses
		.filter((e: any) => e.type === 'default')
		.map((e: any) => ({
			name: e.description,
			amount: e.amount,
			createdAt: new Date(e.ts / 1000),
			parentId:
				budgetNameToId[
					data.budgets.find((b: any) => b.id === e.budgetId)?.name
				],
			// DB handles id, updatedAt
		}))
		.filter((e: any) => !!e.parentId) // Only insert if parentId found

	const defaultInstallments = data.expenses
		.filter((i: any) => i.type === 'installment')
		.map((i: any) => ({
			name: i.description,
			amount: i.amount,
			createdAt: new Date(i.ts / 1000),
			parentId:
				loanNameToId[data.budgets.find((l: any) => l.id === i.budgetId)?.name],
			// DB handles id, updatedAt
		}))
		.filter((i: any) => !!i.parentId) // Only insert if parentId found

	const expensesStatements: BatchItem<'pg'>[] = []
	const installemntsStatements: BatchItem<'pg'>[] = []

	for (const e of defaultExpenses) {
		expensesStatements.push(db.insert(ExpensesTable).values(e))
	}

	for (const i of defaultInstallments) {
		installemntsStatements.push(db.insert(InstallmentsTable).values(i))
	}

	if (expensesStatements.length > 0) {
		await db.batch(expensesStatements as [BatchItem<'pg'>])
	}

	if (installemntsStatements.length > 0) {
		await db.batch(installemntsStatements as [BatchItem<'pg'>])
	}

	// Step 3: recalculate budgets and loans totals
	if (insertedBudgets && insertedBudgets?.length) {
		for (const b of insertedBudgets) {
			await recalculateBudgetTotals(b[0]?.id)
		}
	}

	if (insertedLoans && insertedLoans?.length) {
		for (const l of insertedLoans) {
			await recalculateLoansTotals(l[0]?.id)
		}
	}

	// eslint-disable-next-line no-console
	console.log('Database populated from data.json')
}

async function recalculateBudgetTotals(parentId: string) {
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
		.where(eq(BudgetsTable.id, parentId))

	const availableQuota = (budget?.totalQuota ?? 0) - expensesTotal

	// 3. Update the budget
	await db
		.update(BudgetsTable)
		.set({
			expensesTotal,
			availableQuota,
		})
		.where(eq(BudgetsTable.id, parentId))
}

async function recalculateLoansTotals(parentId: string) {
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
		.where(eq(LoansTable.id, parentId))

	const dueAmount = (loan?.totalDebt ?? 0) - installmensTotal

	// 3. Update the loan
	await db
		.update(LoansTable)
		.set({
			installmensTotal,
			dueAmount,
		})
		.where(eq(LoansTable.id, parentId))
}
