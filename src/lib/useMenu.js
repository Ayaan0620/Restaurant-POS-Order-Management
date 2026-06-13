import { useEffect, useState } from 'react'
import { subscribeMenu, initMenu, saveMenu } from './menuStore.js'

// Subscribe a component to the live (editable) menu.
export function useMenu() {
  const [menu, setMenu] = useState(() => [])

  useEffect(() => {
    initMenu()
    const unsub = subscribeMenu(setMenu)
    return unsub
  }, [])

  return { menu, saveMenu }
}
