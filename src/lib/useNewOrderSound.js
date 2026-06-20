import { useEffect, useRef, useState } from 'react'
import { installAudioUnlock, isAudioReady, onAudioReady, playChime } from './chime.js'

// Rings the bell whenever a new active order appears. Audio is armed globally on
// the first user gesture (typically the PIN entry), so no per-view tap is needed.
// Returns { soundReady, test }.
export function useNewOrderSound(activeOrders) {
  const [soundReady, setSoundReady] = useState(() => isAudioReady())
  const seenRef = useRef(null) // ids already seen (null until first load)

  useEffect(() => {
    installAudioUnlock()
    if (isAudioReady()) setSoundReady(true)
    return onAudioReady(() => setSoundReady(true))
  }, [])

  // Chime when a new active order id shows up.
  useEffect(() => {
    const ids = new Set(activeOrders.map((o) => o.id))
    if (seenRef.current === null) {
      seenRef.current = ids // first load: don't chime for existing orders
      return
    }
    const fresh = [...ids].some((id) => !seenRef.current.has(id))
    if (fresh) playChime()
    seenRef.current = ids
  }, [activeOrders])

  return { soundReady, test: () => playChime() }
}
