import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { env } from '@/data/env/server'
import { deleteUser } from '@/server/db/users'

export async function POST(req: Request) {
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
			if (event.data.id != null) {
				await deleteUser(event.data.id)
			}
			break
		}
	}

	return new Response('', { status: 200 })
}
