'use server'

import { getAddTodoSchema } from '@/schemas/entries'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import {
	createTodo as createTodoDB,
	updateTodo as updateTodoDB,
	deleteTodo as deleteTodoDB,
} from '@/server/db/todos'
import { isPostgresError } from '@/lib/utils'

const AddTodoSchema = getAddTodoSchema()
const PartialAddTodoSchema = AddTodoSchema.partial()

export async function createTodo(
	unsafeData: z.infer<typeof AddTodoSchema>
): Promise<{ error: boolean; message: string }> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = AddTodoSchema.safeParse(unsafeData)
	const errorMessage = t('error_creating_todo')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	try {
		const isSuccess = await createTodoDB({
			...data,
			clerkUserId: userId,
		})

		return {
			error: !isSuccess,
			message: isSuccess ? t('success_saving_todo') : errorMessage,
		}
	} catch (error) {
		let message = t('error_unexpected')

		if (error instanceof Error && error.cause && isPostgresError(error.cause)) {
			// Unique violation error code
			if (error.cause.code === '23505') {
				message = t('error_todo_not_unique', { name: data.name })
			} else {
				// eslint-disable-next-line no-console
				console.error(
					'Neon Database Error:',
					error.message,
					'Code:',
					error.cause.code
				)
			}
		}

		return {
			error: true,
			message,
		}
	}
}

export async function updateTodo(
	id: string,
	unsafeData: z.infer<typeof PartialAddTodoSchema>
): Promise<{ error: boolean; message: string }> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const { success, data } = PartialAddTodoSchema.safeParse(unsafeData)
	const errorMessage = t('error_updating_todo')

	if (!success || userId == null) {
		return {
			error: true,
			message: errorMessage,
		}
	}

	const isSuccess = await updateTodoDB(data, {
		id,
		userId,
	})

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_updating_todo') : errorMessage,
	}
}

export async function deleteTodo(
	id: string
): Promise<{ error: boolean; message: string }> {
	const { userId } = await auth()
	const t = await getTranslations('server_messages')

	const errorMessage = t('error_deleting_todo')

	if (userId == null) {
		return { error: true, message: errorMessage }
	}

	const isSuccess = await deleteTodoDB({ id, userId })

	return {
		error: !isSuccess,
		message: isSuccess ? t('success_deleting_todo') : errorMessage,
	}
}
