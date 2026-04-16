import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { env } from '@/data/env/server'
import { deleteUser } from '@/features/users/db/users'
import { NextRequest } from 'next/server'

// Test route
// export async function GET() {
// 	return Response.json({ message: 'The route is working' })
// }

export async function POST(req: NextRequest) {
	const headerPayload = await headers()
	const svixId = headerPayload.get('svix-id')
	const svixTimestamp = headerPayload.get('svix-timestamp')
	const svixSignature = headerPayload.get('svix-signature')

	if (!svixId || !svixTimestamp || !svixSignature) {
		return new Response('Error occurred -- no svix headers', {
			status: 400,
		})
	}

	const payload = await req.json()
	const body = JSON.stringify(payload)

	const wh = new Webhook(env.CLERK_WEBHOOK_SECRET)
	let event: WebhookEvent

	try {
		event = wh.verify(body, {
			'svix-id': svixId,
			'svix-timestamp': svixTimestamp,
			'svix-signature': svixSignature,
		}) as WebhookEvent
	} catch {
		return new Response('Error occurred', {
			status: 400,
		})
	}

	switch (event.type) {
		case 'user.deleted': {
			const clerkUserId = event.data.id
			if (clerkUserId != null) {
				try {
					const deletedRows = await deleteUser(clerkUserId)
					// eslint-disable-next-line no-console
					console.log(
						`@@ User with clerkUserId=${clerkUserId} deleted. Number of rows deleted:`,
						deletedRows,
					)
				} catch (error) {
					// eslint-disable-next-line no-console
					console.log(
						`@@ Error deleting User with clerkUserId=${clerkUserId}:`,
						error,
					)
				}
			}
			break
		}
	}

	return new Response('', { status: 200 })
}
