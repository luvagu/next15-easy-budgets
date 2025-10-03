import { Button } from '@/components/ui/button'
import { SignedOut, SignUpButton } from '@clerk/nextjs'
import { ArrowRightIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function HomeLayoutPage() {
	const t = await getTranslations('home')

	return (
		<section className='min-h-screen flex flex-col items-center justify-center text-center text-balance gap-8 px-4 bg-[radial-gradient(hsl(0,72%,65%,40%),hsl(24,62%,73%,40%),var(--background)_60%)]'>
			<h1 className='text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight m-4'>
				{t('hero_welcome_header')}
			</h1>
			<p className='text-lg lg:text-3xl max-w-screen-xl'>
				{t('hero_welcome_message')}
			</p>
			<SignedOut>
				<SignUpButton>
					<Button className='group text-lg p-6 rounded-xl flex gap-2 cursor-pointer'>
						{t('label_get_started_free')}{' '}
						<ArrowRightIcon className='size-5 group-hover:translate-x-1 transition-transform' />
					</Button>
				</SignUpButton>
			</SignedOut>
		</section>
	)
}
