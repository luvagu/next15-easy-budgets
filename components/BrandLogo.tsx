import { useTranslations } from 'next-intl'
import { HandCoins } from 'lucide-react'

export function BrandLogo() {
	const t = useTranslations('navbar')

	return (
		<span className='flex items-center gap-2 font-semibold shrink-0 text-lg'>
			<HandCoins className='size-8' />
			<span>{t('navbar_logo_guest')}</span>
		</span>
	)
}
