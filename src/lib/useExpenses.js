import { useEffect, useState } from 'react'
import { subscribeExpenses, initExpenses, saveExpenses } from './expensesStore.js'

// Subscribe a component to the live (editable) expenses list.
export function useExpenses() {
  const [expenses, setExpenses] = useState(() => [])

  useEffect(() => {
    initExpenses()
    const unsub = subscribeExpenses(setExpenses)
    return unsub
  }, [])

  return { expenses, saveExpenses }
}
