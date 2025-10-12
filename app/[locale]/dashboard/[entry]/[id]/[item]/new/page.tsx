import { getTranslations } from 'next-intl/server'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	ENTRY_TYPES,
	FormEntryItemType,
	FormEntryType,
	TABS,
} from '@/constants/types'
import { PageWithBackButton } from '@/app/[locale]/dashboard/_components/PageWithBackButton'
import { EntryItemForm } from '@/app/[locale]/dashboard/_components/forms/EntryItemForm'
import { getBudget } from '@/server/db/budgets'
import { getLoan } from '@/server/db/loans'
import { auth } from '@clerk/nextjs/server'

export default async function NewEntryItemPage({
	params,
}: {
	params: Promise<{ entry: FormEntryType; id: string; item: FormEntryItemType }>
}) {
	const { userId, redirectToSignIn } = await auth()

	if (userId == null) {
		return redirectToSignIn()
	}

	const { entry, id, item } = await params

	const isBudget = entry === ENTRY_TYPES.BUDGET
	const isLoan = entry === ENTRY_TYPES.LOAN

	const budget = isBudget ? await getBudget({ id, userId }) : undefined
	const loan = isLoan ? await getLoan({ id, userId }) : undefined
	const entryData = budget || loan

	const t = await getTranslations('forms')

	const parentPageName = entryData?.name || t(`form_${entry}_details_title`)
	const childPageName = t(`form_create_${item}_title`)
	const formTitle = t(`form_${item}_details_title`)
	const formDescription = t(`form_${item}_description`)

	return (
		<PageWithBackButton
			backButtonHref={`/dashboard/${entry}/${id}/edit?tab=${TABS.ITEMS}`}
			parentPageName={parentPageName}
			childPageName={childPageName}
		>
			<Card>
				<CardHeader>
					<CardTitle className='text-xl'>{formTitle}</CardTitle>
					<CardDescription>{formDescription}</CardDescription>
				</CardHeader>
				<CardContent>
					<EntryItemForm parentId={id} entryItem={item} />
				</CardContent>
			</Card>
		</PageWithBackButton>
	)
}
