import { BrandLogo } from '@/app/[locale]/_components/BrandLogo'
import { LocaleSwitcher } from '@/app/[locale]/_components/LocaleSwitcher'
import { ThemeToggle } from '@/app/[locale]/_components/ThemeToggle'
import { Link } from '@/i18n/navigation'
import { Show, SignInButton } from '@clerk/nextjs'
import { getTranslations } from 'next-intl/server'

export async function NavBar() {
	const t = await getTranslations('navbar')

	return (
		<header className='flex py-6 px-4 sm:px-0 shadow-xl fixed top-0 w-full z-10 bg-background/95'>
			<nav className='flex items-center gap-4 sm:gap-10 container mx-auto font-semibold'>
				<Link href={'/'} className='mr-auto'>
					<BrandLogo />
				</Link>
				<div className='flex items-center gap-1'>
					<LocaleSwitcher />
					<ThemeToggle />
				</div>
				<span className='sm:text-lg'>
					<Show when='signed-out'>
						<SignInButton>{t('label_login')}</SignInButton>
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
