'use server'

import { getAllExchangeRates, upsertExchangeRate } from '../db/exchangeRates'
import { revalidateExchangeRatesCache } from '../db/cache'

const API_URL =
	process.env.EXCHANGE_RATE_API_URL ??
	'https://open.er-api.com/v6/latest/USD'

const TARGET_CURRENCIES = ['USD', 'EUR', 'VES']

export async function refreshExchangeRates() {
	try {
		const cachedRates = await getAllExchangeRates()

		// Check if any rate is stale (lastFetchedAt before start of today UTC)
		const todayStart = new Date()
		todayStart.setUTCHours(0, 0, 0, 0)

		const isStale =
			cachedRates.length === 0 ||
			cachedRates.some(
				r => new Date(r.lastFetchedAt) < todayStart
			)

		if (!isStale) return { error: false, rates: cachedRates }

		// Fetch fresh rates
		const response = await fetch(API_URL)
		const data = await response.json()

		if (data.result !== 'success') {
			// Return stale cached rates as fallback
			return {
				error: true,
				message: 'Failed to fetch exchange rates',
				rates: cachedRates,
			}
		}

		// Upsert each target currency
		for (const code of TARGET_CURRENCIES) {
			const rate = data.rates[code] ?? null
			if (rate != null) {
				await upsertExchangeRate(code, rate)
			}
		}

		revalidateExchangeRatesCache()

		const freshRates = await getAllExchangeRates()
		return { error: false, rates: freshRates }
	} catch {
		// On failure, return whatever is cached
		const fallbackRates = await getAllExchangeRates()
		return {
			error: true,
			message: 'Exchange rate refresh failed',
			rates: fallbackRates,
		}
	}
}
