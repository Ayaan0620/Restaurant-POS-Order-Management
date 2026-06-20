// ============================================================================
// Durable local store — the foundation of the "never lose an order" guarantee.
//
// Every order is written to TWO independent on-device stores before we ever
// touch the network:
//   1. localStorage  (synchronous, survives refresh, instantly readable)
//   2. IndexedDB     (larger, more durable backup; survives localStorage clears
//                     in some browsers and bigger data volumes)
//
// A write is considered "safe" once it lands in localStorage synchronously; the
// IndexedDB mirror is best-effort redundancy on top of that. If either store is
// unavailable (private mode, quota), the other still protects the order.
//
// Records are the full order, plus local bookkeeping:
//   _synced : boolean  — confirmed written to Supabase
//   _seq    : number   — local monotonic counter (tie-break / ordering)
//   _op     : string   — last local intent: 'create' | 'collect' | 'void'
// ============================================================================

const LS_KEY = 'orders_cache_v1'
const LS_SEQ = 'orders_seq_v1'
const IDB_NAME = 'stall_orders'
const IDB_STORE = 'orders'

// In-memory working copy (id -> record). Source of truth for the running app.
const mem = new Map()
let loaded = false
let idbPromise = null

// ---- IndexedDB helpers (best-effort; failures never throw to callers) ------

function openIDB() {
  if (idbPromise) return idbPromise
  idbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return idbPromise
}

async function idbPutAll(records) {
  const db = await openIDB()
  if (!db) return
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    for (const r of records) store.put(r)
  } catch {
    /* ignore */
  }
}

async function idbGetAll() {
  const db = await openIDB()
  if (!db) return []
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

// ---- localStorage helpers --------------------------------------------------

function lsReadAll() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const obj = JSON.parse(raw)
    return Object.values(obj)
  } catch {
    return []
  }
}

function lsWriteAll() {
  try {
    const obj = {}
    for (const [id, r] of mem) obj[id] = r
    localStorage.setItem(LS_KEY, JSON.stringify(obj))
    return true
  } catch {
    // Quota / private mode — IndexedDB mirror is our backup.
    return false
  }
}

// ---- Public API ------------------------------------------------------------

// Load both stores into memory, merging by id (prefer the newer record).
export async function loadLocal() {
  if (loaded) return getAll()
  const fromLS = lsReadAll()
  const fromIDB = await idbGetAll()
  const merge = (r) => {
    const existing = mem.get(r.id)
    if (!existing) {
      mem.set(r.id, r)
    } else {
      // Prefer the record with the higher local sequence (most recent intent).
      if ((r._seq || 0) >= (existing._seq || 0)) mem.set(r.id, r)
    }
  }
  fromLS.forEach(merge)
  fromIDB.forEach(merge)
  loaded = true
  // Heal: make sure both stores hold the merged result.
  lsWriteAll()
  idbPutAll([...mem.values()])
  return getAll()
}

export function getAll() {
  return [...mem.values()]
}

export function get(id) {
  return mem.get(id) || null
}

// Next local sequence number (monotonic across the session + persisted).
export function nextSeq() {
  let seq = 0
  try {
    seq = parseInt(localStorage.getItem(LS_SEQ) || '0', 10) || 0
  } catch {
    /* ignore */
  }
  seq += 1
  try {
    localStorage.setItem(LS_SEQ, String(seq))
  } catch {
    /* ignore */
  }
  return seq
}

// Durably save a record to BOTH stores. Returns true if at least one succeeded.
export function saveLocal(record) {
  mem.set(record.id, record)
  const okLS = lsWriteAll()
  // IndexedDB write is async + best-effort.
  idbPutAll([record])
  return okLS // localStorage is our synchronous "safe" signal
}

// Replace the entire memory set (used when merging server rows back in).
export function upsertMany(records) {
  for (const r of records) mem.set(r.id, r)
  lsWriteAll()
  idbPutAll(records)
}

// All records still needing to be pushed to the server.
export function unsynced() {
  return [...mem.values()].filter((r) => !r._synced)
}

// Wipe this device's local order cache (both stores) for a clean-slate reset.
// Use only when intentionally resetting before service — clears the outbox too.
export async function clearLocalOrders() {
  mem.clear()
  try {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_SEQ)
  } catch {
    /* ignore */
  }
  try {
    const db = await openIDB()
    if (db) {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).clear()
    }
  } catch {
    /* ignore */
  }
}
