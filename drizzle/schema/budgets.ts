import { CardBgColors } from '@/constants/types'
import { relations } from 'drizzle-orm'
import { index, pgTable, text, uuid, real } from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from '../schemaHelpers'

export const BudgetsTable = pgTable(
	'budgets',
	{
		id,
		clerkUserId: text('clerk_user_id').notNull(),
		name: text('name').notNull().unique(),
		totalQuota: real('total_quota').notNull(),
		bgColor: text('bg_color').$type<CardBgColors>().notNull(),
		expensesTotal: real('expenses_total').default(0),
		availableQuota: real('available_quota').default(0),
		createdAt,
		updatedAt,
	},
	table => [index('budgets.clerk_user_id_index').on(table.clerkUserId)]
)

export const budgetsRelations = relations(BudgetsTable, ({ many }) => ({
	budgetExpenses: many(ExpensesTable),
}))

export const ExpensesTable = pgTable(
	'expenses',
	{
		id,
		parentId: uuid('parent_id')
			.notNull()
			.references(() => BudgetsTable.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		amount: real('amount').notNull(),
		createdAt,
		updatedAt,
	},
	table => [index('expenses.parent_id_index').on(table.parentId)]
)

export const expensesRelations = relations(ExpensesTable, ({ one }) => ({
	budget: one(BudgetsTable, {
		fields: [ExpensesTable.parentId],
		references: [BudgetsTable.id],
	}),
}))
