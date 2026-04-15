import { BrandLogo } from '@/components/BrandLogo'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Link } from '@/i18n/navigation'
import { UserButton } from '@clerk/nextjs'

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
				<UserButton />
			</nav>
		</header>
	)
}
