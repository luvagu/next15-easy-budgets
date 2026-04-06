export const CARD_BG_COLORS = {
	white: ['bg-muted dark:bg-muted', 'text-gray-700 dark:text-gray-300'],
	orange: ['bg-orange-100 dark:bg-orange-900', 'text-orange-700 dark:text-orange-300'],
	yellow: ['bg-yellow-100 dark:bg-yellow-900', 'text-yellow-700 dark:text-yellow-300'],
	lime: ['bg-lime-100 dark:bg-lime-900', 'text-lime-700 dark:text-lime-300'],
	emerald: ['bg-emerald-100 dark:bg-emerald-900', 'text-emerald-700 dark:text-emerald-300'],
	green: ['bg-green-100 dark:bg-green-900', 'text-green-700 dark:text-green-300'],
	cyan: ['bg-cyan-100 dark:bg-cyan-900', 'text-cyan-700 dark:text-cyan-300'],
	sky: ['bg-sky-100 dark:bg-sky-900', 'text-sky-700 dark:text-sky-300'],
	blue: ['bg-blue-100 dark:bg-blue-900', 'text-blue-700 dark:text-blue-300'],
	violet: ['bg-violet-100 dark:bg-violet-900', 'text-violet-700 dark:text-violet-300'],
	pink: ['bg-pink-100 dark:bg-pink-900', 'text-pink-700 dark:text-pink-300'],
} as const

export type CardBgColors = keyof typeof CARD_BG_COLORS

export const ENTRY_TYPES = {
	BUDGET: 'budget',
	BUDGETS: 'budgets',
	EXPENSES: 'expenses',
	EXPENSE: 'expense',
	LOAN: 'loan',
	LOANS: 'loans',
	INSTALLMENTS: 'installments',
	INSTALLMENT: 'installment',
	TODOS: 'todos',
	INVENTORY: 'inventory',
} as const

export const TABS = {
	BUDGETS: ENTRY_TYPES.BUDGETS,
	LOANS: ENTRY_TYPES.LOANS,
	DETAILS: 'details',
	ITEMS: 'items',
	TODOS: 'todos',
	INVENTORY: ENTRY_TYPES.INVENTORY,
	FOR: 'for',
	AGAINST: 'against',
} as const

export type FormEntryType = typeof ENTRY_TYPES.BUDGET | typeof ENTRY_TYPES.LOAN

export type FormEntryItemType =
	| typeof ENTRY_TYPES.EXPENSE
	| typeof ENTRY_TYPES.INSTALLMENT

export type NoEntryTypes = {
	type: typeof ENTRY_TYPES.BUDGET | typeof ENTRY_TYPES.LOAN
}

export type FormItemType =
	| typeof ENTRY_TYPES.EXPENSE
	| typeof ENTRY_TYPES.INSTALLMENT

export type DashboardTabs =
	| typeof TABS.BUDGETS
	| typeof TABS.LOANS
	| typeof TABS.INVENTORY

export type EntryTabs = typeof TABS.DETAILS | typeof TABS.ITEMS

export type DeleteEntry =
	| typeof ENTRY_TYPES.BUDGET
	| typeof ENTRY_TYPES.LOAN
	| typeof ENTRY_TYPES.EXPENSE
	| typeof ENTRY_TYPES.INSTALLMENT

export const CACHE_TAGS = {
	budgets: ENTRY_TYPES.BUDGETS,
	expenses: ENTRY_TYPES.EXPENSES,
	loans: ENTRY_TYPES.LOANS,
	installments: ENTRY_TYPES.INSTALLMENTS,
	todos: ENTRY_TYPES.TODOS,
	inventory: 'inventory',
	categories: 'categories',
	invoices: 'invoices',
	exchangeRates: 'exchange_rates',
} as const

export type GrigEntryTypes =
	| typeof ENTRY_TYPES.BUDGET
	| typeof ENTRY_TYPES.BUDGETS
	| typeof ENTRY_TYPES.LOAN
	| typeof ENTRY_TYPES.LOANS

export type SharedEntryFields = {
	id: string
	name: string
	totalQuota?: number | null
	totalDebt?: number | null
	isAgainst?: boolean | null
	expensesTotal?: number | null
	installmensTotal?: number | null
	availableQuota?: number | null
	dueAmount?: number | null
	dueDate?: Date | null
	amount?: number | null
	bgColor: CardBgColors
	createdAt?: Date
	updatedAt?: Date
}

export type BudgetEntryFields = {
	id: string
	name: string
	totalQuota?: number | null
	expensesTotal?: number | null
	availableQuota?: number | null
	amount?: number | null
	bgColor: CardBgColors
	createdAt?: Date
	updatedAt?: Date
}

export type LoanEntryFields = {
	id: string
	name: string
	totalDebt?: number | null
	isAgainst?: boolean | null
	installmensTotal?: number | null
	dueAmount?: number | null
	dueDate?: Date | null
	bgColor: CardBgColors
	createdAt?: Date
	updatedAt?: Date
}

export type TodoEntryFields = {
	id: string
	name: string
	clerkUserId: string
	createdAt: Date
	updatedAt: Date
	completed: boolean
}

export type DashboardPageProps = {
	budgets: BudgetEntryFields[]
	loans: LoanEntryFields[]
	todosLis: TodoEntryFields[]
	inventoryItemCount: number
}

export type GridEntriesArray = SharedEntryFields[]

export type BudgetEntryDetails = {
	id: string
	name: string
	bgColor: CardBgColors
	totalQuota: number
	budgetExpenses: {
		id: string
		name: string
		createdAt: Date
		parentId: string
		amount: number
	}[]
}

export type UpdateBudgetEntry = {
	[ENTRY_TYPES.BUDGET]?: {
		id: string
		name: string
		bgColor: CardBgColors
		totalQuota: number
	}
}

export type LoanEntryDetails = {
	id: string
	name: string
	bgColor: CardBgColors
	totalDebt: number
	isAgainst: boolean
	dueDate: Date | null
	loanInstallments: {
		id: string
		name: string
		createdAt: Date
		parentId: string
		amount: number
	}[]
}

export type UpdateLoanEntry = {
	[ENTRY_TYPES.LOAN]?: {
		id: string
		name: string
		bgColor: CardBgColors
		totalDebt: number
		isAgainst: boolean
		dueDate: Date | null
	}
}

export type CreateEntryItem = {
	parentId: string
	entryItem: typeof ENTRY_TYPES.EXPENSE | typeof ENTRY_TYPES.INSTALLMENT
}

export type UpdateEntryItem = {
	entryItem: typeof ENTRY_TYPES.EXPENSE | typeof ENTRY_TYPES.INSTALLMENT
	parentId: string
	items: { id: string; name: string; amount: number; createdAt: Date }[]
	entries?: { id: string; name: string }[]
}

export type MoveEntryItemsForm = {
	open: boolean
	setOpen: (isOpen: boolean) => void
	parentId: string
	entryItem: typeof ENTRY_TYPES.EXPENSE | typeof ENTRY_TYPES.INSTALLMENT
	checkedItemId?: string
	entries?: {
		id: string
		name: string
	}[]
	items?: {
		id: string
		name: string
	}[]
}

export type LoanTypeTabs = typeof TABS.FOR | typeof TABS.AGAINST

export type UserSettings = {
	selectedDashboadTab: DashboardTabs
	selectedLoanTypeTab: LoanTypeTabs
}

export type BudgetsSummary = {
	grandBudgetsTotalQuota: number
	grandBudgetsExpensesTotal: number
	grandBudgetsAvailableQuota: number
}

export type LoansSummaryGroup = {
	grandLoansTotalDebt: number
	grandLoansInstallemtsTotal: number
	grandLoansDueAmoutTotal: number
}

export type LoansSummary = {
	for: LoansSummaryGroup
	against: LoansSummaryGroup
}
