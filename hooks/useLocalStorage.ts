'use client'

import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
	const [storedValue, setStoredValue] = useState<T>(initialValue)
	const [isHydrated, setIsHydrated] = useState(false)

	// Read from localStorage after hydration
	useEffect(() => {
		try {
			const item = window.localStorage.getItem(key)
			if (item) {
				setStoredValue(JSON.parse(item))
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error)
		}
		setIsHydrated(true)
	}, [key])

	// Update localStorage when state changes (only after hydration)
	useEffect(() => {
		if (!isHydrated) return
		try {
			window.localStorage.setItem(key, JSON.stringify(storedValue))
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error)
		}
	}, [key, storedValue, isHydrated])

	// Function to remove the item
	const removeValue = () => {
		try {
			window.localStorage.removeItem(key)
			setStoredValue(initialValue) // Reset to default
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error)
		}
	}

	return [storedValue, setStoredValue, removeValue, isHydrated] as const
}
