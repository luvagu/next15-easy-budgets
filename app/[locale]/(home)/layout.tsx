import { NavBar } from './_components/NavBar'

export default async function AuthLayout({
	children,
}: LayoutProps<'/[locale]'>) {
	return (
		<div className='selection:bg-[hsl(320,65%,52%,20%)]'>
			<NavBar />
			{children}
		</div>
	)
}
