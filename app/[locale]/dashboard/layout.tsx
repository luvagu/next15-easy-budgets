import { getTranslations } from 'next-intl/server'
import { NavBar } from './_components/NavBar'

// dynamic metadata
export async function generateMetadata() {
	const t = await getTranslations('metadata')

	return {
		title: t('meta_dashboard_title'),
	}
}

export default function DashboardLayout({
	children,
}: LayoutProps<'/[locale]/dashboard'>) {
	return (
		<div className='bg-accent min-h-screen'>
			<NavBar />
			<div className='container mx-auto py-6 px-4 sm:px-0'>{children}</div>
		</div>
	)
}
