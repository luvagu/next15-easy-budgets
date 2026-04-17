import { BrandLogo } from '@/app/[locale]/_components/BrandLogo'
import { LocaleSwitcher } from '@/app/[locale]/_components/LocaleSwitcher'
import { ThemeToggle } from '@/app/[locale]/_components/ThemeToggle'
import { Link } from '@/i18n/navigation'
import { Show, UserButton } from '@clerk/nextjs'

export function NavBar() {
	return (
		<header className='flex py-6 px-4 sm:px-0 shadow bg-background'>
			<nav className='flex items-center gap-4 sm:gap-10 container mx-auto'>
				<Link className='mr-auto' href='/dashboard'>
					<BrandLogo />
				</Link>
				<div className='flex items-center gap-1'>
					<LocaleSwitcher />
					<ThemeToggle />
				</div>
				<Show when='signed-in'>
					<UserButton />
				</Show>
			</nav>
		</header>
	)
}
