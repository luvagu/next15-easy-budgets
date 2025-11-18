import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
	CARD_BG_COLORS,
	CardBgColors,
	ENTRY_TYPES,
	FormEntryItemType,
	FormEntryType,
} from '@/constants/types'
import { defaultLocale } from '@/i18n/routing'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function getCardBgColorNames() {
	return Object.keys(CARD_BG_COLORS) as CardBgColors[]
}

export function getCardBgColorsArray() {
	return Object.entries(CARD_BG_COLORS) as [
		CardBgColors,
		(typeof CARD_BG_COLORS)[CardBgColors]
	][]
}

export function getCardClassNameBgColors(bgColor: CardBgColors) {
	return CARD_BG_COLORS[bgColor][0]
}

export function curencyFormatter(value: number, locale: string) {
	return new Intl.NumberFormat(locale || defaultLocale, {
		currency: 'USD',
		style: 'currency',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value)
}

export function calculateProgressValue(current: number, max: number) {
	const percent = Number((current / max) * 100)

	return percent > 100 ? 100 : percent
}

export function getProgresBgColor(progressValue: number, isLoan: boolean) {
	const bgColors = {
		red: 'bg-red-500',
		purple: 'bg-purple-500',
		yellow: 'bg-yellow-500',
		blue: 'bg-blue-500',
		green: 'bg-green-500',
	}

	if (progressValue < 25) return isLoan ? bgColors.red : bgColors.green
	if (progressValue < 50) return isLoan ? bgColors.purple : bgColors.blue
	if (progressValue < 75) return isLoan ? bgColors.yellow : bgColors.yellow
	if (progressValue < 99) return isLoan ? bgColors.blue : bgColors.purple

	return isLoan ? bgColors.green : bgColors.red
}

export function normalizeEntryName(word: string) {
	// handle empty input
	if (!word) return ''

	// 1) collapse multiple spaces to one and trim ends
	const collapsed = word.replace(/\s+/g, ' ').trim()

	// 2) remove spaces around separators globally so "jun - jul" => "jun-jul"
	const normalized = collapsed.replace(/\s*([\-\/_])\s*/g, '$1')

	// 3) capitalize first character
	const capitalized =
		normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()

	// 3) split by single space into tokens
	const tokens = capitalized.split(' ').map(tok => {
		// if token contains any separator, normalize casing and capitalize parts
		if (/[\/\-_]/.test(tok)) {
			let s = tok.toLowerCase()
			// capitalize first character
			if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1)
			// capitalize after separators
			s = s.replace(
				/([\-\/_])([a-z])/g,
				(_m, sep, ch) => sep + ch.toUpperCase()
			)
			return s
		}

		// non-separator tokens: leave original token (trimmed-capitalized) as-is
		return tok
	})

	return tokens.join(' ')
}

export function getItemsParentKey(entryItem: FormEntryItemType) {
	return entryItem === ENTRY_TYPES.EXPENSE
		? ENTRY_TYPES.BUDGET
		: ENTRY_TYPES.LOAN
}

export function getParentItemsKey(entry: FormEntryType) {
	return entry === ENTRY_TYPES.BUDGET
		? ENTRY_TYPES.EXPENSE
		: ENTRY_TYPES.INSTALLMENT
}

export function getEntryKey(entry: FormEntryType) {
	return entry === ENTRY_TYPES.BUDGET
		? ENTRY_TYPES.EXPENSE
		: ENTRY_TYPES.INSTALLMENT
}

interface PostgresError {
	code: string
}

// Check if an error is a Postgres error
export function isPostgresError(error: unknown): error is PostgresError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof (error as PostgresError).code === 'string'
	)
}
