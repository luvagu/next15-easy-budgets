export default async function AuthLayout({
	children,
}: LayoutProps<'/[locale]'>) {
	return (
		<div className='min-h-screen flex flex-col justify-center items-center'>
			{children}
		</div>
	)
}
