// Small formatting + date helpers shared across views.

// European number formatting: comma decimal, dot thousands (e.g. 2.776,87).
const eurNF = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Format a number as euros, EU style, e.g. 8.5 -> "€8,50", 2776.87 -> "€2.776,87".
export function euro(n) {
  return '€' + eurNF.format(Number(n) || 0)
}

// Parse a user-typed amount that may use a comma decimal (and/or dot thousands).
// "8,50" -> 8.5 · "1.234,56" -> 1234.56 · "8.50" -> 8.5 · "20" -> 20
export function parseDecimal(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0
  let s = String(input ?? '').trim()
  if (!s) return 0
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // Mixed -> EU style: dots are thousands, comma is the decimal.
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    s = s.replace(',', '.')
  }
  s = s.replace(/[^0-9.\-]/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// Value to show inside a money <input>: numbers render with a comma decimal,
// while a string the user is actively typing is passed through untouched.
export function decimalInputValue(v) {
  if (v === '' || v == null) return ''
  if (typeof v === 'number') return v === 0 ? '' : String(v).replace('.', ',')
  return v
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
