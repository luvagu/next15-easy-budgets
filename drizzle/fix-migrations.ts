/**
 * fix-migrations.ts
 *
 * Repairs the Drizzle migration history in Neon by inserting rows for every
 * migration that was already applied via `db:push --force` but never recorded
 * in `drizzle.__drizzle_migrations`.
 *
 * Usage:
 *   npm run db:fix-migrations
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
	console.error('❌  DATABASE_URL is not set. Check your .env file.')
	process.exit(1)
}

const MIGRATIONS_DIR = path.resolve('drizzle/migrations')
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta/_journal.json')
const SCHEMA = 'drizzle'
const TABLE = '__drizzle_migrations'

interface JournalEntry {
	idx: number
	version: string
	when: number
	tag: string
	breakpoints: boolean
}
interface Journal {
	entries: JournalEntry[]
}

function sha256(content: string): string {
	return crypto.createHash('sha256').update(content).digest('hex')
}

async function main() {
	const sql = neon(DATABASE_URL!)

	// 1 — Read journal
	const journal: Journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'))
	const entries = journal.entries.sort((a, b) => a.when - b.when)

	// 2 — Compute expected rows (mirrors drizzle-orm/migrator readMigrationFiles)
	const migrations = entries.map(entry => {
		const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`)
		const content = fs.readFileSync(sqlPath, 'utf8')
		return { tag: entry.tag, hash: sha256(content), folderMillis: entry.when }
	})

	// 3 — Ensure schema + table exist (mirrors what drizzle-orm does at migrate time)
	await sql.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`)
	await sql.query(`
		CREATE TABLE IF NOT EXISTS ${SCHEMA}.${TABLE} (
			id         SERIAL PRIMARY KEY,
			hash       text NOT NULL,
			created_at bigint
		)
	`)

	// 4 — Fetch what is already recorded
	const existing = (await sql.query(
		`SELECT hash, created_at FROM ${SCHEMA}.${TABLE} ORDER BY created_at ASC`,
	)) as { hash: string; created_at: string }[]
	const existingHashes = new Set(existing.map(r => r.hash))

	console.log(`\nFound ${existing.length} migration(s) already recorded in DB.`)

	// 5 — Insert missing rows
	let inserted = 0
	for (const m of migrations) {
		if (existingHashes.has(m.hash)) {
			console.log(`  ✔  already applied: ${m.tag}`)
		} else {
			await sql.query(
				`INSERT INTO ${SCHEMA}.${TABLE} (hash, created_at) VALUES ($1, $2)`,
				[m.hash, m.folderMillis],
			)
			console.log(`  ➕  marked as applied: ${m.tag}`)
			inserted++
		}
	}

	if (inserted === 0) {
		console.log('\n✅  All migrations were already recorded — nothing to do.')
	} else {
		console.log(
			`\n✅  Inserted ${inserted} missing migration record(s). db:migrate should now work correctly.`,
		)
	}
}

main().catch(err => {
	console.error('❌  Script failed:', err)
	process.exit(1)
})
