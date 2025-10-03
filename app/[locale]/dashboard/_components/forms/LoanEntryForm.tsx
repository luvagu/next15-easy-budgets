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
import { getLoanEntrySchema } from '@/schemas/entries'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CardBgColorsRG } from './CardBgColorsRG'
import { normalizeEntryName } from '@/lib/utils'
import { UpdateLoanEntry } from '@/constants/types'
import { createLoan, updateLoan } from '@/server/actions/entries'

export function LoanEntryForm({ loan }: UpdateLoanEntry) {
	const t = useTranslations('forms')
	const message = t('required')
	const LoanEntrySchema = getLoanEntrySchema(message)

	const form = useForm<z.infer<typeof LoanEntrySchema>>({
		resolver: zodResolver(LoanEntrySchema),
		defaultValues: {
			name: loan?.name ?? '',
			totalDebt: loan?.totalDebt ?? 0,
			bgColor: loan?.bgColor ?? 'sky',
			isAgainst: loan?.isAgainst ?? false,
		},
	})

	const onSubmit = async (values: z.infer<typeof LoanEntrySchema>) => {
		const action = loan == null ? createLoan : updateLoan.bind(null, loan.id)
		const response = await action({
			...values,
			name: normalizeEntryName(values.name),
		})

		if (loan && !response?.error) {
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
						name='totalDebt'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t(`label_loan_amount`)}</FormLabel>
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
										// {...form.register('totalDebt', { valueAsNumber: true })}
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
					<FormField
						control={form.control}
						name='isAgainst'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('label_loan_type')}</FormLabel>
								<div className='flex items-center gap-2'>
									<FormControl>
										<Switch
											id='for-orp-against'
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<Label htmlFor='for-orp-against'>
										{t(field.value ? 'label_loan_against' : 'label_loan_for')}
									</Label>
								</div>
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
