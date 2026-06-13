import { useEffect, useState } from 'react'
import {
  subscribe,
  initOrders,
  createOrder,
  collectOrder,
  voidOrder,
  reactivateOrder,
  nextOrderNumber,
  flushOutbox,
} from './orders.js'

// Subscribe a component to the live orders store.
// Returns the current orders, connection status, unsynced count, and actions.
export function useOrders() {
  const [state, setState] = useState({ orders: [], connection: 'connecting', unsyncedCount: 0 })

  useEffect(() => {
    initOrders()
    const unsub = subscribe(setState)
    return unsub
  }, [])

  return {
    ...state,
    createOrder,
    collectOrder,
    voidOrder,
    reactivateOrder,
    nextOrderNumber,
    flushOutbox,
  }
}

// Keep the device awake while a critical view is open (cashier / pickup).
// Re-acquires the lock when the tab becomes visible again.
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let lock = null
    let cancelled = false

    async function acquire() {
      try {
        if ('wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen')
        }
      } catch {
        /* not supported / denied — non-fatal */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      try {
        lock && lock.release()
      } catch {
        /* ignore */
      }
    }
  }, [enabled])
}

// Warn the operator before leaving the page while orders are still unsynced.
export function useUnsyncedGuard(unsyncedCount) {
  useEffect(() => {
    if (!unsyncedCount) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [unsyncedCount])
}

// Re-render every `ms` so elapsed-time labels stay fresh.
export function useTicker(ms = 1000) {
  const [, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}
