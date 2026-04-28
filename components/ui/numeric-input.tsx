'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Regex: allow digits + optional single decimal point (no minus — all inventory
// amounts are non-negative).
const DECIMAL_RE = /^\d*\.?\d*$/
const INTEGER_RE = /^\d*$/

interface NumericInputProps {
	value: number
	onChange: (value: number) => void
	onBlur?: () => void
	/** Restrict to integers only. Defaults to false. */
	integer?: boolean
	placeholder?: string
	disabled?: boolean
	className?: string
	'aria-label'?: string
}

/**
 * Numeric text input that avoids the react-hook-form + type="number" coercion
 * loop. Uses `type="text" inputMode="decimal|numeric"` so the mobile keyboard
 * is correct while still allowing partial values like "1." during typing.
 *
 * External value changes (e.g. form.reset, form.setValue from another field)
 * are detected via the `sentValue` state and immediately reflected in the
 * display — including on blur — so there is no stale-display race condition.
 */
export function NumericInput({
	value,
	onChange,
	onBlur,
	integer = false,
	className,
	...rest
}: NumericInputProps) {
	// display  = the raw string the user is currently typing
	// sentValue = the last numeric value we forwarded to the parent
	const [display, setDisplay] = useState(value === 0 ? '' : String(value))
	const [sentValue, setSentValue] = useState(value)

	// When the parent changes `value` externally (form.setValue / form.reset),
	// sentValue will lag behind. We derive the visible string on-the-fly so the
	// input immediately reflects the external change without a useEffect.
	const isExternalChange = sentValue !== value
	const displayValue = isExternalChange
		? value === 0
			? ''
			: String(value)
		: display

	const re = integer ? INTEGER_RE : DECIMAL_RE

	return (
		<Input
			type='text'
			inputMode={integer ? 'numeric' : 'decimal'}
			value={displayValue}
			className={cn(
				'[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
				className,
			)}
			onChange={e => {
				const raw = e.target.value
				if (raw === '' || re.test(raw)) {
					setDisplay(raw)
					const num = integer ? parseInt(raw, 10) : parseFloat(raw)
					const safe = isNaN(num) ? 0 : num
					setSentValue(safe)
					onChange(safe)
				}
			}}
			onBlur={() => {
				// Normalise using the *effective* displayed string, not the possibly-stale
				// `display` state, so that external value changes are not lost on blur.
				const effective = isExternalChange
					? value === 0
						? ''
						: String(value)
					: display
				const num = (integer ? parseInt(effective, 10) : parseFloat(effective)) || 0
				const normalised = num === 0 ? '' : String(num)
				setDisplay(normalised)
				setSentValue(num)
				onChange(num)
				onBlur?.()
			}}
			{...rest}
		/>
	)
}
