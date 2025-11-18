import { index, pgTable, text, boolean } from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from '../schemaHelpers'

export const TodosTable = pgTable(
	'todos',
	{
		id,
		clerkUserId: text().notNull(),
		name: text().notNull().unique(),
		completed: boolean().notNull().default(false),
		createdAt,
		updatedAt,
	},
	table => [index('todos.clerk_user_id_index').on(table.clerkUserId)]
)
