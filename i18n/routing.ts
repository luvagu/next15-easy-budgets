import { defineRouting } from 'next-intl/routing'

export const defaultLocale = 'en' as const

export const routing = defineRouting({
	// A list of all locales that are supported
	locales: [defaultLocale, 'es'],

	// Used when no locale matches
	defaultLocale,

	localePrefix: 'as-needed',
})
