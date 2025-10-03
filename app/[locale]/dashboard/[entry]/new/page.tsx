import { getTranslations } from 'next-intl/server'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { PageWithBackButton } from '../../_components/PageWithBackButton'
import { BudgetEntryForm } from '../../_components/forms/BudgetEntryForm'
import { LoanEntryForm } from '../../_components/forms/LoanEntryForm'
import { ENTRY_TYPES, FormEntryType } from '@/constants/types'

export default async function NewEntryPage({
	params,
}: {
	params: Promise<{ entry: FormEntryType }>
}) {
	const { entry } = await params
	const t = await getTranslations('forms')

	const isBudget = entry === ENTRY_TYPES.BUDGET
	const isLoan = entry === ENTRY_TYPES.LOAN

	const parentPageName = t(`form_create_${entry}_title`)
	const formTitle = t(`form_${entry}_details_title`)
	const formDescription = t(`form_${entry}_description`)

	const returnTap =
		entry === ENTRY_TYPES.BUDGET ? ENTRY_TYPES.BUDGETS : ENTRY_TYPES.LOANS

	return (
		<PageWithBackButton
			backButtonHref={`/dashboard?tab=${returnTap}`}
			parentPageName={parentPageName}
		>
			<Card>
				<CardHeader>
					<CardTitle className='text-xl'>{formTitle}</CardTitle>
					<CardDescription>{formDescription}</CardDescription>
				</CardHeader>
				<CardContent>
					{isBudget && <BudgetEntryForm />}
					{isLoan && <LoanEntryForm />}
				</CardContent>
			</Card>
		</PageWithBackButton>
	)
}
