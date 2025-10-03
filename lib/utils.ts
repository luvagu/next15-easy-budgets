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

export function normalizeEntryName(name: string) {
	const nameWithoutWhiteSpaces = name.trim()

	return (
		nameWithoutWhiteSpaces.charAt(0).toUpperCase() +
		nameWithoutWhiteSpaces.slice(1)
	)
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
