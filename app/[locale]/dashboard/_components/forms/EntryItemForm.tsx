'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { normalizeEntryName } from '@/lib/utils'
import { ENTRY_TYPES, CreateEntryItem } from '@/constants/types'
import { getEntryItemSchema } from '@/schemas/entries'
import { createExpense, createInstallment } from '@/server/actions/entries'

export function EntryItemForm({ parentId, entryItem }: CreateEntryItem) {
	const t = useTranslations('forms')
	const message = t('required')
	const EntryItemSchema = getEntryItemSchema(message)

	const form = useForm<z.infer<typeof EntryItemSchema>>({
		resolver: zodResolver(EntryItemSchema),
		defaultValues: {
			name: '',
			amount: 0,
		},
	})

	const onSubmit = async (values: z.infer<typeof EntryItemSchema>) => {
		const isExpense = entryItem === ENTRY_TYPES.EXPENSE
		const action = isExpense ? createExpense : createInstallment

		const response = await action(
			{
				...values,
				name: normalizeEntryName(values.name),
			},
			parentId
		)

		if (response?.error) {
			toast.error(response.message)
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='flex flex-col gap-6'
			>
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6'>
					<FormField
						control={form.control}
						name='name'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('label_name')}</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='amount'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t(`label_${entryItem}_amount`)}</FormLabel>
								<FormControl>
									<Input
										type='number'
										{...field}
										step='any'
										min={0}
										onChange={e =>
											field.onChange(
												isNaN(e.target.valueAsNumber)
													? ''
													: e.target.valueAsNumber
											)
										}
										// {...form.register('amount', { valueAsNumber: true })}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className='self-end'>
					<Button disabled={form.formState.isSubmitting} type='submit'>
						{t('label_save')}
					</Button>
				</div>
			</form>
		</Form>
	)
}
