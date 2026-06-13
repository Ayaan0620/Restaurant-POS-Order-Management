// ============================================================================
// Editable menu store.
//
// The menu is no longer a static file at runtime — the Admin page can edit it.
// It persists in TWO places so it survives refreshes AND reaches other devices:
//   1. localStorage  (instant, offline, per-device)
//   2. Supabase `app_settings` row (key='menu')  (syncs to the cashier device)
//
// On first run it seeds from src/menu.config.js. If Supabase isn't configured
// or the app_settings table doesn't exist yet, it degrades gracefully to
// localStorage-only (single device) — nothing breaks.
// ============================================================================

import { supabase } from './supabaseClient.js'
import seed from '../menu.config.js'
import { uuid } from './format.js'

const LS_KEY = 'menu_v1'
const SETTINGS_KEY = 'menu'

let menu = null
let inited = false
const listeners = new Set()

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Give every item a stable id. Seed items use a name-slug so the id is the same
// across devices that seed independently; new items get a uuid.
function withIds(list) {
  return list.map((it) => ({
    id: it.id || slug(it.name) || uuid(),
    name: it.name,
    price: Number(it.price) || 0,
    category: it.category || 'Other',
    veg: !!it.veg,
  }))
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(menu)
    } catch {
      /* ignore */
    }
  })
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

function writeLocal(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function getMenu() {
  if (!menu) menu = withIds(readLocal() || seed)
  return menu
}

export function subscribeMenu(fn) {
  listeners.add(fn)
  fn(getMenu())
  return () => listeners.delete(fn)
}

// Persist a new menu everywhere and notify subscribers.
export async function saveMenu(list) {
  menu = withIds(list)
  writeLocal(menu)
  emit()
  if (supabase) {
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: SETTINGS_KEY, value: menu }, { onConflict: 'key' })
    } catch {
      /* table may not exist yet — localStorage still holds the edit */
    }
  }
  return menu
}

async function fetchFromServer() {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()
    if (error) throw error
    if (data && Array.isArray(data.value) && data.value.length) {
      menu = withIds(data.value)
      writeLocal(menu)
      emit()
    } else {
      // No server menu yet — push our current (seed/local) one up so other
      // devices can read it.
      saveMenu(getMenu())
    }
  } catch {
    /* offline or table missing — keep localStorage menu */
  }
}

export async function initMenu() {
  if (inited) return
  inited = true
  getMenu() // ensure local is loaded
  if (supabase) {
    await fetchFromServer()
    try {
      supabase
        .channel('menu-settings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.${SETTINGS_KEY}` },
          (payload) => {
            const v = payload.new?.value
            if (Array.isArray(v)) {
              menu = withIds(v)
              writeLocal(menu)
              emit()
            }
          },
        )
        .subscribe()
    } catch {
      /* realtime optional */
    }
  }
}

// Convenience for the editor: a blank new item.
export function blankItem() {
  return { id: uuid(), name: '', price: 0, category: '', veg: true }
}
