import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
	/* config options here */
	typedRoutes: true,
	experimental: {
		// useCache: true,
		// cacheComponents: true,
		// authInterrupts: true,
		staleTimes: {
			dynamic: 0,
		},
		// serverActions: {
		// 	allowedOrigins: [
		// 		'localhost:3000', // Your local development origin
		// 		'd80v5r8c-3000.use2.devtunnels.ms', // The x-forwarded-host from your dev tunnel
		// 		// Add any other origins your application might use, e.g., production domains
		// 	],
		// },
	},
}

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(nextConfig)
