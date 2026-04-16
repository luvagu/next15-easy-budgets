import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { NextResponse } from 'next/server'

// 1. Define next-intl routing
const intlMiddleware = createMiddleware(routing)

// 2. Define protected routes (e.g., any path containing /dashboard)
const isProtectedRoute = createRouteMatcher([
	'/dashboard(.*)',
	'/:locale/dashboard(.*)',
])

export default clerkMiddleware(async (auth, req) => {
	const { userId } = await auth()
	const { pathname } = req.nextUrl

	// 3. Detect locale from next-intl (stored in cookie or default)
	const locale = req.cookies.get('NEXT_LOCALE')?.value || routing.defaultLocale

	// 4. Redirect logged-in users from the root to their locale-specific dashboard
	if (userId && (pathname === '/' || pathname === `/${locale}`)) {
		// With 'as-needed', don't add the prefix if it's the default locale
		const dashboardPath = new URL(
			locale === routing.defaultLocale ? '/dashboard' : `/${locale}/dashboard`,
			req.url,
		)

		return NextResponse.redirect(dashboardPath)
	}

	// 5. Enforce authentication for protected routes
	if (isProtectedRoute(req)) {
		await auth.protect()
	}

	// 6. Skip intl middleware for API/tRPC routes — they have no locale
	if (pathname.startsWith('/api/') || pathname.startsWith('/trpc/')) {
		return NextResponse.next()
	}

	// 7. Run next-intl middleware for all locale-aware routes
	return intlMiddleware(req)
})

export const config = {
	// Matcher for internationalized routes and Clerk's needs
	matcher: [
		'/',
		'/(es|en)/:path*',
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
}
