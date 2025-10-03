'use client'

import { Controller, useForm } from 'react-hook-form'
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
import { getBudgetEntrySchema } from '@/schemas/entries'
import { toast } from 'sonner'
import { CardBgColorsRG } from './CardBgColorsRG'
import { normalizeEntryName } from '@/lib/utils'
import { UpdateBudgetEntry } from '@/constants/types'
import { createBudget, updateBudget } from '@/server/actions/entries'

export function BudgetEntryForm({ budget }: UpdateBudgetEntry) {
	const t = useTranslations('forms')
	const message = t('required')
	const BudgetEntrySchema = getBudgetEntrySchema(message)

	const form = useForm<z.infer<typeof BudgetEntrySchema>>({
		resolver: zodResolver(BudgetEntrySchema),
		defaultValues: {
			name: budget?.name ?? '',
			totalQuota: budget?.totalQuota ?? 0,
			bgColor: budget?.bgColor ?? 'white',
		},
	})

	const onSubmit = async (values: z.infer<typeof BudgetEntrySchema>) => {
		const action =
			budget == null ? createBudget : updateBudget.bind(null, budget.id)
		const response = await action({
			...values,
			name: normalizeEntryName(values.name),
		})

		if (budget && !response?.error) {
			toast.success(response?.message)
		}

		if (response?.error) {
			toast.error(response.message, {
				description: response?.reason,
			})
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
						name='totalQuota'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('label_budget_amount')}</FormLabel>
								<FormControl>
									<Input
										type='number'
										{...field}
										step='any'
										min={1}
										onChange={e =>
											field.onChange(
												isNaN(e.target.valueAsNumber)
													? ''
													: e.target.valueAsNumber
											)
										}
										// {...form.register('totalQuota', { valueAsNumber: true })}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Controller
						control={form.control}
						name='bgColor'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('label_card_bg_color')}</FormLabel>
								<FormControl>
									<CardBgColorsRG
										value={field.value}
										onChange={field.onChange}
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
