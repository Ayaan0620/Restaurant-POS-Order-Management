import { useEffect, useRef, useState } from 'react'
import { makeChime } from './chime.js'

// Plays the bell chime whenever a new active order appears.
// Sound is "on by default": browsers require one interaction before audio is
// allowed, so we arm it on the FIRST tap/keypress anywhere (which happens within
// seconds of opening the view). Returns { soundReady, test }.
export function useNewOrderSound(activeOrders) {
  const [soundReady, setSoundReady] = useState(false)
  const chimeRef = useRef(null)
  const seenRef = useRef(null) // ids already seen (null until first load)

  // Arm audio on the first user gesture.
  useEffect(() => {
    if (soundReady) return
    let done = false
    const arm = async () => {
      if (done) return
      done = true
      try {
        const c = makeChime()
        await c.unlock()
        c.beep() // confirmation chime
        chimeRef.current = c
      } catch {
        /* ignore */
      }
      setSoundReady(true)
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
    window.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', arm)
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [soundReady])

  // Chime when a new active order id shows up.
  useEffect(() => {
    const ids = new Set(activeOrders.map((o) => o.id))
    if (seenRef.current === null) {
      seenRef.current = ids // first load: don't chime for existing orders
      return
    }
    const fresh = [...ids].some((id) => !seenRef.current.has(id))
    if (fresh && chimeRef.current) chimeRef.current.beep()
    seenRef.current = ids
  }, [activeOrders])

  return { soundReady, test: () => chimeRef.current?.beep() }
}
