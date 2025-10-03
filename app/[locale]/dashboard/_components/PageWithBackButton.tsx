import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { ChevronLeft } from 'lucide-react'
import { ReactNode } from 'react'

export function PageWithBackButton({
	backButtonHref,
	parentPageName,
	childPageName,
	children,
}: {
	backButtonHref: string
	parentPageName: string
	childPageName?: string
	children: ReactNode
}) {
	return (
		<div className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-8 sm:gap-y-4'>
			<Button size='icon' variant='outline' className='rounded-full' asChild>
				<Link href={backButtonHref}>
					<div className='sr-only'>Back</div>
					<ChevronLeft className='size-8' />
				</Link>
			</Button>
			<Breadcrumb className='self-center'>
				<BreadcrumbList className='text-base sm:text-lg'>
					<BreadcrumbItem>{parentPageName}</BreadcrumbItem>
					{childPageName && (
						<>
							<BreadcrumbSeparator />
							<BreadcrumbItem className='max-w-40 sm:max-w-full'>
								<BreadcrumbPage className='truncate'>
									{childPageName}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</>
					)}
				</BreadcrumbList>
			</Breadcrumb>
			<div className='col-[span_2] sm:col-start-2'>{children}</div>
		</div>
	)
}
