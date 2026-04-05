'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreatableComboboxProps {
	options: string[]
	value: string
	onChange: (value: string) => void
	placeholder?: string
	emptyLabel?: string
}

export function CreatableCombobox({
	options,
	value,
	onChange,
	placeholder = 'Select...',
	emptyLabel = 'No results.',
}: CreatableComboboxProps) {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState('')

	const filtered = options.filter(o =>
		o.toLowerCase().includes(search.toLowerCase())
	)

	const showCreate =
		search.trim().length > 0 &&
		!options.some(o => o.toLowerCase() === search.trim().toLowerCase())

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className='w-full justify-between font-normal'
				>
					<span className={cn(!value && 'text-muted-foreground')}>
						{value || placeholder}
					</span>
					<ChevronsUpDownIcon className='size-3.5 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={`Search or create...`}
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						{filtered.length === 0 && !showCreate && (
							<CommandEmpty>{emptyLabel}</CommandEmpty>
						)}
						{showCreate && (
							<CommandGroup>
								<CommandItem
									onSelect={() => {
										onChange(search.trim())
										setSearch('')
										setOpen(false)
									}}
								>
									<PlusIcon className='size-3.5' />
									Create &quot;{search.trim()}&quot;
								</CommandItem>
							</CommandGroup>
						)}
						{filtered.length > 0 && (
							<CommandGroup>
								{filtered.map(option => (
									<CommandItem
										key={option}
										onSelect={() => {
											onChange(option)
											setSearch('')
											setOpen(false)
										}}
									>
										<CheckIcon
											className={cn(
												'size-3.5',
												value === option
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
										{option}
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
