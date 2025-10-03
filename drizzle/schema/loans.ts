import { CardBgColors } from '@/constants/types'
import { relations } from 'drizzle-orm'
import { index, pgTable, text, uuid, boolean, real } from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from '../schemaHelpers'

export const LoansTable = pgTable(
	'loans',
	{
		id,
		clerkUserId: text('clerk_user_id').notNull(),
		name: text('name').notNull().unique(),
		totalDebt: real('total_debt').notNull(),
		bgColor: text('bg_color').$type<CardBgColors>().notNull(),
		isAgainst: boolean('is_against').notNull(),
		installmensTotal: real('installmens_total').default(0),
		dueAmount: real('due_amount').default(0),
		createdAt,
		updatedAt,
	},
	table => [index('loans.clerk_user_id_index').on(table.clerkUserId)]
)

export const loansRelations = relations(LoansTable, ({ many }) => ({
	loanInstallments: many(InstallmentsTable),
}))

export const InstallmentsTable = pgTable(
	'installments',
	{
		id,
		parentId: uuid('parent_id')
			.notNull()
			.references(() => LoansTable.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		amount: real('amount').notNull(),
		createdAt,
		updatedAt,
	},
	table => [index('installments.parent_id_index').on(table.parentId)]
)

export const installmentsRelations = relations(
	InstallmentsTable,
	({ one }) => ({
		loan: one(LoansTable, {
			fields: [InstallmentsTable.parentId],
			references: [LoansTable.id],
		}),
	})
)
