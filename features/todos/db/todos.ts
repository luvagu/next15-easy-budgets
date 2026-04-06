import { db } from '@/drizzle/db'
import { TodosTable } from '@/drizzle/schema/todos'
import { and, eq } from 'drizzle-orm'
import { cacheTag } from 'next/cache'
import {
	getTodosGlobalTag,
	getUserTodosTag,
	revalidateTodosCache,
} from './cache'

export async function createTodo(data: typeof TodosTable.$inferInsert) {
	const [newTodo] = await db
		.insert(TodosTable)
		.values(data)
		.returning({ id: TodosTable.id, userId: TodosTable.clerkUserId })

	revalidateTodosCache({ id: newTodo.id, userId: newTodo.userId })

	return newTodo
}

export async function updateTodo(
	data: Partial<typeof TodosTable.$inferInsert>,
	{ id, userId }: { id: string; userId: string },
) {
	const { rowCount } = await db
		.update(TodosTable)
		.set(data)
		.where(and(eq(TodosTable.clerkUserId, userId), eq(TodosTable.id, id)))

	const isSuccess = rowCount > 0

	if (isSuccess) {
		revalidateTodosCache({ id, userId })
	}

	return isSuccess
}

export async function deleteTodo({
	id,
	userId,
}: {
	id: string
	userId: string
}) {
	const { rowCount } = await db
		.delete(TodosTable)
		.where(and(eq(TodosTable.id, id), eq(TodosTable.clerkUserId, userId)))

	const isDeleted = rowCount > 0

	if (isDeleted) {
		revalidateTodosCache({ id, userId })
	}

	return isDeleted
}

export async function getTodos(
	userId: string,
	{ limit }: { limit?: number } = {},
) {
	'use cache'

	cacheTag(getTodosGlobalTag(), getUserTodosTag(userId))

	return await db.query.TodosTable.findMany({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		orderBy: ({ createdAt }, { asc }) => asc(createdAt),
		limit,
	})
}
