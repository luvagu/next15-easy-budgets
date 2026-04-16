/* eslint-disable no-console */
/**
 * backfill-invoice-numbers.ts
 *
 * Re-assigns invoice_number values to all existing sales_invoices in
 * chronological order (oldest invoice → 1, next → 2, …) and updates any
 * linked loan whose name still uses the legacy "HB: <customer>" prefix to the
 * new "HB-<n>: <customer>" format.
 *
 * After backfilling it resets the Postgres sequence so that future inserts
 * continue from MAX(invoice_number) + 1 without collisions.
 *
 * Usage:
 *   npm run db:backfill-invoices
 */

import { neon } from '@neondatabase/serverless'
import { INVOICE_NUM_PREFIX } from '../constants/constants'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
	console.error('❌  DATABASE_URL is not set. Check your .env file.')
	process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
	// 1. Fetch all invoices ordered chronologically, including linked loan info
	const invoices = await sql`
		SELECT
			si.id,
			si.invoice_number,
			si.customer_name,
			si.created_at,
			si.loan_id,
			l.name AS loan_name
		FROM sales_invoices si
		LEFT JOIN loans l ON l.id = si.loan_id
		ORDER BY si.created_at ASC
	`

	if (invoices.length === 0) {
		console.log('ℹ️  No invoices found — nothing to backfill.')
		return
	}

	console.log(`📋  Found ${invoices.length} invoice(s). Re-assigning numbers…`)

	let loanUpdates = 0

	for (let i = 0; i < invoices.length; i++) {
		const invoice = invoices[i]
		const newNumber = i + 1

		// Update invoice_number
		await sql`
			UPDATE sales_invoices
			SET invoice_number = ${newNumber}
			WHERE id = ${invoice.id}
		`

		// Update the linked loan name if it exists and uses the legacy prefix
		if (invoice.loan_id && invoice.loan_name) {
			const legacyPrefix = `HB: ${invoice.customer_name}`
			const newPrefix = `${INVOICE_NUM_PREFIX}${newNumber}: ${invoice.customer_name}`

			if (invoice.loan_name === legacyPrefix) {
				await sql`
					UPDATE loans
					SET name = ${newPrefix}
					WHERE id = ${invoice.loan_id}
				`
				loanUpdates++
			}
		}
	}

	// 2. Reset the sequence to MAX(invoice_number) so future inserts don't collide
	await sql`
		SELECT setval(
			pg_get_serial_sequence('sales_invoices', 'invoice_number'),
			${invoices.length}
		)
	`

	console.log(`✅  Backfilled ${invoices.length} invoice(s).`)
	if (loanUpdates > 0) {
		console.log(
			`🔗  Updated ${loanUpdates} linked loan name(s) to ${INVOICE_NUM_PREFIX}{n} format.`,
		)
	}
	console.log(
		`🔢  Sequence reset to ${invoices.length}; next insert will be ${INVOICE_NUM_PREFIX}${invoices.length + 1}.`,
	)
}

main().catch(err => {
	console.error('❌  Backfill failed:', err)
	process.exit(1)
})
