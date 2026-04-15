'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { GlobeIcon } from 'lucide-react'

export function LocaleSwitcher() {
	const t = useTranslations('locale_switcher')
	const locale = useLocale()
	const router = useRouter()
	const pathname = usePathname()
	const [isPending, startTransition] = useTransition()

	function handleLocaleChange(nextLocale: string) {
		startTransition(() => {
			router.replace(pathname, {
				locale: nextLocale,
			})
		})
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					aria-label={t('label_toggle')}
					disabled={isPending}
				>
					<GlobeIcon className='h-[1.2rem] w-[1.2rem]' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				{routing.locales.map(loc => (
					<DropdownMenuItem
						key={loc}
						onClick={() => handleLocaleChange(loc)}
						className={loc === locale ? 'font-semibold' : ''}
					>
						{t(loc)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
