import { db } from '@/drizzle/db'
import { ExchangeRatesCacheTable } from '@/drizzle/schema'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
import {
	getExchangeRatesGlobalTag,
	revalidateExchangeRatesCache,
} from './cache'

export async function getAllExchangeRates() {
	'use cache'

	cacheTag(getExchangeRatesGlobalTag())

	return await db
		.select()
		.from(ExchangeRatesCacheTable)
		.orderBy(ExchangeRatesCacheTable.currencyCode)
}

export async function getExchangeRate(currencyCode: string) {
	'use cache'

	cacheTag(getExchangeRatesGlobalTag())

	return await db.query.ExchangeRatesCacheTable.findFirst({
		where: (fields, { eq }) => eq(fields.currencyCode, currencyCode),
	})
}

export async function upsertExchangeRate(
	currencyCode: string,
	rateToUsd: number,
) {
	await db
		.insert(ExchangeRatesCacheTable)
		.values({
			currencyCode,
			rateToUsd,
			lastFetchedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: ExchangeRatesCacheTable.currencyCode,
			set: {
				rateToUsd,
				lastFetchedAt: new Date(),
			},
		})

	revalidateExchangeRatesCache()
}
