import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getCardBgColorsArray } from '@/lib/utils'

const CARD_BG_COLORS_ARRAY = getCardBgColorsArray()

export function CardBgColorsRG({
	value,
	onChange,
}: {
	value: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onChange: (...event: any[]) => void
}) {
	return (
		<RadioGroup value={value} onValueChange={onChange}>
			<div className='flex flex-wrap gap-2'>
				{CARD_BG_COLORS_ARRAY.map(([name, [bgColor]]) => (
					<div
						key={name}
						className={`${bgColor} flex flex-col items-center px-2 py-1.5 rounded-md border border-input`}
					>
						<RadioGroupItem value={name} className='bg-white' id={name} />
					</div>
				))}
			</div>
		</RadioGroup>
	)
}
