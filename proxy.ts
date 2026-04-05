import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

const isPublicRoute = createRouteMatcher([
	'/',
	'/es',
	'/sign-in(.*)',
	'/sign-up(.*)',
	'/es/sign-in(.*)',
	'/es/sign-up(.*)',
	'/api(.*)',
])

export default clerkMiddleware(async (auth, req) => {
	if (!isPublicRoute(req)) {
		await auth.protect()
	}

	return intlMiddleware(req)
})

export const config = {
	matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
