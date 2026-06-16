// ============================================================================
// Orders data layer + sync engine.
//
// A small observable store that the React views subscribe to. It merges:
//   - the durable local store (localStore.js)  — never-lose-an-order backbone
//   - the Supabase server rows + realtime stream — cross-device sync
//
// Write path (create / collect / void):
//   1. mutate the record locally and saveLocal()  -> order is now SAFE on disk
//   2. notify subscribers immediately (optimistic UI)
//   3. attempt to push to Supabase; on failure it simply stays in the outbox
//      and the background flush loop retries with backoff (idempotent upsert).
// ============================================================================

import { supabase, TABLE, isSupabaseConfigured } from './supabaseClient.js'
import {
  loadLocal,
  saveLocal,
  getAll,
  get,
  upsertMany,
  unsynced,
  nextSeq,
} from './localStore.js'
import { uuid, todayISO, pad3 } from './format.js'

// ---- Observable store ------------------------------------------------------

const listeners = new Set()
let connection = isSupabaseConfigured ? 'connecting' : 'local' // 'online'|'offline'|'connecting'|'local'
let initialized = false
let flushTimer = null
let backoff = 2000

function snapshot() {
  return {
    orders: getAll(),
    connection,
    unsyncedCount: unsynced().length,
  }
}

function emit() {
  const snap = snapshot()
  listeners.forEach((fn) => {
    try {
      fn(snap)
    } catch {
      /* ignore listener errors */
    }
  })
}

export function subscribe(fn) {
  listeners.add(fn)
  fn(snapshot())
  return () => listeners.delete(fn)
}

export function getConnection() {
  return connection
}

function setConnection(next) {
  if (connection !== next) {
    connection = next
    emit()
  }
}

// ---- Server row <-> local record mapping -----------------------------------

// Strip local-only bookkeeping fields before sending to Supabase.
function toRow(r) {
  return {
    id: r.id,
    order_number: r.order_number,
    items: r.items,
    total: r.total,
    subtotal: r.subtotal ?? r.total,
    discount_pct: r.discount_pct ?? 0,
    vat: r.vat ?? 0,
    payment_method: r.payment_method ?? 'cash',
    status: r.status,
    order_type: r.order_type,
    created_at: r.created_at,
    collected_at: r.collected_at,
    date: r.date,
  }
}

// Merge a server row into local cache, unless we hold a newer unsynced change.
function mergeServerRow(row) {
  const local = get(row.id)
  if (local && !local._synced) return // our pending change wins; flush will push it
  const merged = {
    ...row,
    _synced: true,
    _seq: local?._seq ?? nextSeq(),
    _op: 'server',
  }
  upsertMany([merged])
}

// ---- Public reads ----------------------------------------------------------

export function getOrders() {
  return getAll()
}

// Next padded 3-digit order number for a given date.
// Looks across every locally known order (synced + unsynced) for that date so
// offline orders still advance the counter. Resets daily (filtered by date).
export function nextOrderNumber(date = todayISO()) {
  let max = 0
  for (const r of getAll()) {
    if (r.date !== date) continue
    const n = parseInt(r.order_number, 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return pad3(max + 1)
}

// ---- Writes ----------------------------------------------------------------

export async function createOrder({
  items,
  total,
  subtotal,
  discount_pct = 0,
  vat = 0,
  payment_method = 'cash',
  order_type = 'dinein',
}) {
  const date = todayISO()
  const record = {
    id: uuid(),
    order_number: nextOrderNumber(date),
    items,
    total,
    subtotal: subtotal ?? total,
    discount_pct,
    vat,
    payment_method,
    status: 'active',
    order_type,
    created_at: new Date().toISOString(),
    collected_at: null,
    date,
    _synced: false,
    _seq: nextSeq(),
    _op: 'create',
  }
  // STEP 1+2: durably save + notify. The order is now safe even if the next
  // line throws or the tab is closed.
  saveLocal(record)
  emit()
  // STEP 3: best-effort immediate push (don't await long; flush loop covers it).
  pushRecord(record)
  return record
}

export async function collectOrder(id) {
  const r = get(id)
  if (!r) return
  const updated = {
    ...r,
    status: 'collected',
    collected_at: new Date().toISOString(),
    _synced: false,
    _seq: nextSeq(),
    _op: 'collect',
  }
  saveLocal(updated)
  emit()
  pushRecord(updated)
}

export async function voidOrder(id) {
  const r = get(id)
  if (!r) return
  const updated = {
    ...r,
    status: 'voided',
    _synced: false,
    _seq: nextSeq(),
    _op: 'void',
  }
  saveLocal(updated)
  emit()
  pushRecord(updated)
}

// Edit an existing order's contents (items/total/discount/payment/type). Keeps
// the same id, order_number, created_at and date — re-syncs via upsert.
export async function editOrder(id, fields) {
  const r = get(id)
  if (!r) return null
  const updated = {
    ...r,
    ...fields,
    _synced: false,
    _seq: nextSeq(),
    _op: 'edit',
  }
  saveLocal(updated)
  emit()
  pushRecord(updated)
  return updated
}

// Redo / undo a mistake: put a collected or voided order back to active.
export async function reactivateOrder(id) {
  const r = get(id)
  if (!r) return
  const updated = {
    ...r,
    status: 'active',
    collected_at: null,
    _synced: false,
    _seq: nextSeq(),
    _op: 'reactivate',
  }
  saveLocal(updated)
  emit()
  pushRecord(updated)
}

// ---- Sync ------------------------------------------------------------------

// Push a single record. Idempotent: upsert keyed on the client-generated id,
// so retries (or the same record pushed twice) never create duplicates.
async function pushRecord(record) {
  if (!supabase) {
    // Local-only mode: mark as "synced" so the unsynced badge stays at 0.
    saveLocal({ ...record, _synced: true })
    emit()
    return true
  }
  try {
    const { error } = await supabase.from(TABLE).upsert(toRow(record), { onConflict: 'id' })
    if (error) throw error
    // Confirmed on server — clear the unsynced flag (only if no newer local edit).
    const current = get(record.id)
    if (current && current._seq === record._seq) {
      saveLocal({ ...current, _synced: true })
    }
    setConnection('online')
    emit()
    return true
  } catch {
    setConnection('offline')
    scheduleFlush()
    return false
  }
}

// Push everything still in the outbox. Called on a loop and on reconnect.
export async function flushOutbox() {
  if (!supabase) return
  const pending = unsynced()
  if (pending.length === 0) {
    setConnection('online')
    return
  }
  let allOk = true
  // Sort by sequence so earlier intents apply before later ones.
  pending.sort((a, b) => (a._seq || 0) - (b._seq || 0))
  for (const r of pending) {
    const ok = await pushRecord(r)
    if (!ok) {
      allOk = false
      break // stop on first failure; backoff will retry the rest
    }
  }
  if (allOk) {
    backoff = 2000 // reset backoff after a clean flush
    setConnection('online')
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(async () => {
    flushTimer = null
    await flushOutbox()
    if (unsynced().length > 0) {
      backoff = Math.min(backoff * 2, 30000) // cap at 30s
      scheduleFlush()
    }
  }, backoff)
}

// ---- Init / realtime -------------------------------------------------------

async function fetchRecentFromServer() {
  if (!supabase) return
  try {
    // Pull a generous recent window so pickup/kitchen/reports have data.
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: true })
      .limit(2000)
    if (error) throw error
    if (data) data.forEach(mergeServerRow)
    setConnection('online')
    emit()
  } catch {
    setConnection('offline')
    scheduleFlush()
  }
}

function startRealtime() {
  if (!supabase) return
  supabase
    .channel('orders-stream')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      const row = payload.new && payload.new.id ? payload.new : payload.old
      if (!row) return
      if (payload.eventType === 'DELETE') return // app never deletes
      mergeServerRow(row)
      emit()
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setConnection('online')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnection('offline')
        scheduleFlush()
      }
    })
}

let inited = false
export async function initOrders() {
  if (inited) return
  inited = true
  await loadLocal()
  emit()
  if (isSupabaseConfigured) {
    await fetchRecentFromServer()
    startRealtime()
    await flushOutbox()

    // Retry triggers: coming back online, and tab regaining focus.
    window.addEventListener('online', () => {
      setConnection('connecting')
      fetchRecentFromServer()
      flushOutbox()
    })
    window.addEventListener('offline', () => setConnection('offline'))
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flushOutbox()
    })
    // Steady heartbeat flush as a final safety net.
    setInterval(() => flushOutbox(), 15000)
  }
  initialized = true
}

export function isInitialized() {
  return initialized
}
