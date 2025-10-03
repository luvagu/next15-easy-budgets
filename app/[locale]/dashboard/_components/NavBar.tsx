import { BrandLogo } from '@/components/BrandLogo'
import { Link } from '@/i18n/navigation'
import { UserButton } from '@clerk/nextjs'

export function NavBar() {
	return (
		<header className='flex py-6 px-4 sm:px-0 shadow bg-background'>
			<nav className='flex items-center gap-10 container mx-auto'>
				<Link className='mr-auto' href='/dashboard'>
					<BrandLogo />
				</Link>
				<UserButton />
			</nav>
		</header>
	)
}
