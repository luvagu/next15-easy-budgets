import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
	emptyStringAsUndefined: true,
	server: {
		CLERK_SECRET_KEY: z.string().min(1),
		CLERK_WEBHOOK_SECRET: z.string().min(1),
		DATABASE_URL: z.url(),
		// ToDo: remove
		SEED_USER_ID: z.string().min(1),
	},
	experimental__runtimeEnv: process.env,
})
