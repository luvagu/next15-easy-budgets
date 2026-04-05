import { BrandLogo } from '@/components/BrandLogo'
import { Link } from '@/i18n/navigation'
import { Show, SignInButton } from '@clerk/nextjs'
import { getTranslations } from 'next-intl/server'

export async function NavBar() {
	const t = await getTranslations('navbar')

	return (
		<header className='flex py-6 px-4 sm:px-0 shadow-xl fixed top-0 w-full z-10 bg-background/95'>
			<nav className='flex items-center gap-10 container mx-auto font-semibold'>
				<Link href={'/'} className='mr-auto'>
					<BrandLogo />
				</Link>
				<span className='text-lg'>
					<Show when='signed-out'>
						<SignInButton>
							<button className='cursor-pointer'>{t('label_login')}</button>
						</SignInButton>
					</Show>
					<Show when='signed-in'>
						<Link href={'/dashboard'} className='mr-auto'>
							{t('label_dashboard')}
						</Link>
					</Show>
				</span>
			</nav>
		</header>
	)
}
