import { defineConfig } from 'drizzle-kit'
import { env } from '@/data/env/server'

export default defineConfig({
	out: './drizzle/migrations',
	schema: './drizzle/schema.ts',
	dialect: 'postgresql',
	strict: true,
	verbose: true,
	dbCredentials: {
		url: env.DATABASE_URL!,
	},
})
