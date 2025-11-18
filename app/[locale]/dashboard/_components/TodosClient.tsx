'use client'

import { useState, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Item, ItemActions, ItemContent, ItemGroup } from '@/components/ui/item'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ButtonGroup } from '@/components/ui/button-group'
import { Button } from '@/components/ui/button'
import {
	AudioLinesIcon,
	ListChecksIcon,
	PlusIcon,
	Trash2Icon,
} from 'lucide-react'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { Field, FieldGroup } from '@/components/ui/field'
import { toast } from 'sonner'
import { getAddTodoSchema } from '@/schemas/entries'
import { createTodo, deleteTodo, updateTodo } from '@/server/actions/todos'
import { normalizeEntryName } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { useLocale, useTranslations } from 'next-intl'

const AddTodoSchema = getAddTodoSchema()

export function TodosClient({
	todosLis,
}: {
	todosLis: { id: string; name: string; completed: boolean }[]
}) {
	const t = useTranslations('todos')
	const locale = useLocale()

	const [voiceEnabled, setVoiceEnabled] = useState(false)
	const [currentTaskId, setCurrentTaskId] = useState<undefined | string>()
	const [isUpdating, setIsUpdating] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	const recognitionRef = useRef<SpeechRecognition | null>(null)

	const isEmptyList = todosLis.length === 0

	const form = useForm<z.infer<typeof AddTodoSchema>>({
		resolver: zodResolver(AddTodoSchema),
		defaultValues: {
			name: '',
		},
	})

	async function onSubmit(data: z.infer<typeof AddTodoSchema>) {
		const { error, message } = await createTodo({
			name: normalizeEntryName(data.name),
		})

		if (!error) {
			toast.success(message)
			form.reset()
		} else {
			toast.error(message)
		}
	}

	async function handleChecked(checked: boolean, id: string) {
		setIsUpdating(true)
		setCurrentTaskId(id)

		try {
			const { error, message } = await updateTodo(id, { completed: checked })

			if (!error) {
				toast.success(message)
			} else {
				toast.error(message)
			}
		} finally {
			setIsUpdating(false)
			setCurrentTaskId(undefined)
		}
	}

	async function handleDelete(id: string) {
		setIsDeleting(true)
		setCurrentTaskId(id)

		try {
			const { error, message } = await deleteTodo(id)

			if (!error) {
				toast.success(message)
			} else {
				toast.error(message)
			}
		} finally {
			setIsDeleting(false)
			setCurrentTaskId(undefined)
		}
	}

	const handleOnListening = () => {
		if (typeof window !== 'undefined') {
			if (voiceEnabled && recognitionRef.current) {
				recognitionRef.current.stop()
				setVoiceEnabled(false)
				return
			}

			// Check for browser compatibility (vendor prefix for Safari)
			const SpeechRecognition: typeof window.SpeechRecognition =
				window.SpeechRecognition || (window as any).webkitSpeechRecognition

			if (SpeechRecognition) {
				recognitionRef.current = new SpeechRecognition()
				const recognition = recognitionRef.current

				recognition.continuous = false // Set to true for continuous recognition
				recognition.interimResults = true // Get interim results as speech is recognized
				recognition.lang = locale ?? 'en-US'

				recognition.onstart = () => {
					setVoiceEnabled(true)
					toast(t('alert_listening'))
				}

				recognition.onresult = event => {
					let interimTranscript = ''
					let finalTranscript = ''

					for (let i = event.resultIndex; i < event.results.length; ++i) {
						const result = event.results[i]
						if (result.isFinal) {
							finalTranscript += result[0].transcript
						} else {
							interimTranscript += result[0].transcript
						}
					}

					form.setValue('name', finalTranscript || interimTranscript)
				}

				recognition.onend = () => {
					setVoiceEnabled(false)
					form.handleSubmit(onSubmit)()

					toast(t('alert_listening_ended'))
				}

				recognition.onerror = event => {
					setVoiceEnabled(false)
					form.reset()

					toast.error(t('error_listening'), {
						description: JSON.stringify(event.error),
					})
				}

				recognition.start()
			} else {
				toast.warning(t('warning_unsupported_browser'))
			}
		}
	}

	return (
		<div className='flex w-full flex-col gap-4 pb-8'>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<FieldGroup>
					<ButtonGroup>
						<Controller
							name='name'
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<ButtonGroup>
										<InputGroup className='bg-background'>
											<InputGroupInput
												{...field}
												aria-invalid={fieldState.invalid}
												name={field.name}
												placeholder={t(
													voiceEnabled
														? 'placeholder_say_todo'
														: 'placeholder_add_todo'
												)}
												disabled={voiceEnabled}
												autoComplete='off'
											/>
											<InputGroupAddon align='inline-end'>
												<Tooltip>
													<TooltipTrigger asChild>
														<InputGroupButton
															onClick={handleOnListening}
															size='icon-xs'
															data-active={voiceEnabled}
															className='data-[active=true]:bg-orange-100 data-[active=true]:text-orange-700 dark:data-[active=true]:bg-orange-800 dark:data-[active=true]:text-orange-100 data-[active=true]:animate-pulse'
															aria-pressed={voiceEnabled}
														>
															<AudioLinesIcon />
														</InputGroupButton>
													</TooltipTrigger>
													<TooltipContent>
														{t('label_voice_mode')}
													</TooltipContent>
												</Tooltip>
											</InputGroupAddon>
										</InputGroup>
									</ButtonGroup>
								</Field>
							)}
						/>
						<ButtonGroup>
							<Button
								variant='outline'
								size='icon'
								type='submit'
								disabled={voiceEnabled || form.formState.isSubmitting}
							>
								{form.formState.isSubmitting ? <Spinner /> : <PlusIcon />}
							</Button>
						</ButtonGroup>
					</ButtonGroup>
				</FieldGroup>
			</form>
			{isEmptyList && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<ListChecksIcon />
						</EmptyMedia>
						<EmptyTitle>{t('empty_todos')}</EmptyTitle>
						<EmptyDescription>{t('get_started_todos')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			{!isEmptyList && (
				<ItemGroup className='gap-2'>
					{todosLis.map(todo => (
						<Item
							key={todo.id}
							variant={'outline'}
							size={'sm'}
							className='bg-card hover:bg-sky-50 has-[[aria-checked=true]]:border-sky-600 has-[[aria-checked=true]]:bg-sky-50 dark:has-[[aria-checked=true]]:border-sky-900 dark:has-[[aria-checked=true]]:bg-sky-950'
						>
							<ItemContent>
								<Label
									className='flex items-center gap-3 has-[[aria-checked=true]]:[&>p]:line-through has-[[aria-checked=true]]:[&>p]:decoration-2 has-[[aria-checked=true]]:[&>p]:decoration-sky-600'
									htmlFor={todo.id}
								>
									{isUpdating && currentTaskId === todo.id ? (
										<Spinner className='text-sky-600' />
									) : (
										<Checkbox
											id={todo.id}
											checked={todo.completed}
											disabled={isUpdating || isDeleting}
											className='data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600 data-[state=checked]:text-white dark:data-[state=checked]:border-sky-700 dark:data-[state=checked]:bg-sky-700'
											onCheckedChange={checked =>
												handleChecked(checked === true, todo.id)
											}
										/>
									)}
									<p className='text-sm leading-none font-medium'>
										{todo.name}
									</p>
								</Label>
							</ItemContent>
							<ItemActions>
								<Button
									type='button'
									variant='outline'
									size='icon-sm'
									className='size-6 text-destructive'
									onClick={() => handleDelete(todo.id)}
									disabled={isUpdating || isDeleting}
								>
									{isDeleting && currentTaskId === todo.id ? (
										<Spinner className='text-sky-600' />
									) : (
										<Trash2Icon className='size-4' />
									)}
								</Button>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			)}
		</div>
	)
}
