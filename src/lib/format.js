// Small formatting + date helpers shared across views.

// Format a number as euros, e.g. 8.5 -> "€8.50".
export function euro(n) {
  const v = Number(n) || 0
  return '€' + v.toFixed(2)
}

// Pad an order number to 3 digits, e.g. 47 -> "047".
export function pad3(n) {
  return String(n).padStart(3, '0')
}

// Local date as YYYY-MM-DD (used for "today" filtering + daily number reset).
// Uses the device's local day, not UTC, so the stall's day matches the operator.
export function todayISO(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Human-readable elapsed time since an ISO timestamp, e.g. "3m", "1h 04m".
export function elapsed(fromISO, now = Date.now()) {
  const start = new Date(fromISO).getTime()
  if (!Number.isFinite(start)) return ''
  let secs = Math.max(0, Math.floor((now - start) / 1000))
  const h = Math.floor(secs / 3600)
  secs -= h * 3600
  const m = Math.floor(secs / 60)
  const s = secs - m * 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

// Minutes elapsed since an ISO timestamp (for the "older than 15 min" highlight).
export function minutesSince(fromISO, now = Date.now()) {
  const start = new Date(fromISO).getTime()
  if (!Number.isFinite(start)) return 0
  return (now - start) / 60000
}

// Format an ISO timestamp as a local clock time, e.g. "14:07".
export function clockTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// RFC4122-ish uuid. Uses crypto.randomUUID when available, with a safe fallback.
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback for older browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
