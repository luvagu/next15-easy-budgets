import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
	/* config options here */
	typedRoutes: true,
	experimental: {
		useCache: true,
		staleTimes: {
			dynamic: 0,
		},
		serverActions: {
			allowedOrigins: [
				'localhost:3000', // Your local development origin
				'*.devtunnels.ms', // The x-forwarded-host from your dev tunnel
				// Add any other origins your application might use, e.g., production domains
			],
		},
	},
}

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(nextConfig)
