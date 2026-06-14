// ============================================================================
// Editable expenses store (for the break-even tracker).
// Same persistence model as the menu: localStorage + Supabase app_settings
// (key='expenses'), seeded the first time from the list below.
// ============================================================================

import { supabase } from './supabaseClient.js'
import { uuid } from './format.js'

const LS_KEY = 'expenses_v1'
const SETTINGS_KEY = 'expenses'

// Seeded from the stall's bill — edit any time in Admin -> Expenses.
const SEED = [
  { label: 'Goat', amount: 473.6 },
  { label: 'Groceries', amount: 140.21 },
  { label: 'Stove', amount: 130 },
  { label: 'Petrol', amount: 200 },
  { label: 'Rent', amount: 1500 },
  { label: 'Tissues', amount: 30 },
  { label: 'Misc', amount: 23.06 },
  { label: 'Chicken', amount: 30 },
  { label: 'Roll', amount: 250 },
]

let expenses = null
let inited = false
const listeners = new Set()

const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function withIds(list) {
  return list.map((e) => ({
    id: e.id || slug(e.label) || uuid(),
    label: e.label || '',
    amount: Number(e.amount) || 0,
  }))
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(expenses)
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

export function getExpenses() {
  if (!expenses) expenses = withIds(readLocal() || SEED)
  return expenses
}

export function subscribeExpenses(fn) {
  listeners.add(fn)
  fn(getExpenses())
  return () => listeners.delete(fn)
}

export async function saveExpenses(list) {
  expenses = withIds(list)
  writeLocal(expenses)
  emit()
  if (supabase) {
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: SETTINGS_KEY, value: expenses }, { onConflict: 'key' })
    } catch {
      /* table may not exist yet — localStorage still holds it */
    }
  }
  return expenses
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
      expenses = withIds(data.value)
      writeLocal(expenses)
      emit()
    } else {
      saveExpenses(getExpenses())
    }
  } catch {
    /* offline / table missing */
  }
}

export async function initExpenses() {
  if (inited) return
  inited = true
  getExpenses()
  if (supabase) {
    await fetchFromServer()
    try {
      supabase
        .channel('expenses-settings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.${SETTINGS_KEY}` },
          (payload) => {
            const v = payload.new?.value
            if (Array.isArray(v)) {
              expenses = withIds(v)
              writeLocal(expenses)
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

export function blankExpense() {
  return { id: uuid(), label: '', amount: 0 }
}

export function totalExpenses(list) {
  return (list || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
}
