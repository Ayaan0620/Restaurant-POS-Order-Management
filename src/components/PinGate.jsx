import { useState } from 'react'
import { Link } from 'react-router-dom'

// Per-view PIN gate. Wrap a view in <PinGate viewKey="cashier" pin={...} title="Cashier">.
// - If `pin` is empty/undefined, the view is open (no gate).
// - On success, the unlock is remembered per-device in localStorage, so each
//   device only enters the PIN once (until it's locked again or storage clears).

const storageKey = (viewKey) => `pin_ok_${viewKey}`

function isUnlocked(viewKey, pin) {
  if (!pin) return true // no PIN configured -> open
  try {
    return localStorage.getItem(storageKey(viewKey)) === pin
  } catch {
    return false
  }
}

// Lock a view again (used by the small lock button in headers).
export function lockView(viewKey) {
  try {
    localStorage.removeItem(storageKey(viewKey))
  } catch {
    /* ignore */
  }
  window.location.reload()
}

export default function PinGate({ viewKey, pin, title, accent = '#2563eb', children }) {
  const [ok, setOk] = useState(() => isUnlocked(viewKey, pin))
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)

  if (ok) return children

  function submit() {
    if (entry === pin && pin !== '') {
      try {
        localStorage.setItem(storageKey(viewKey), pin)
      } catch {
        /* ignore */
      }
      setOk(true)
    } else {
      setError(true)
      setEntry('')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mb-6 text-slate-500">Enter the PIN for this view</p>
      <input
        type="password"
        inputMode="numeric"
        value={entry}
        onChange={(e) => {
          setEntry(e.target.value.replace(/\D/g, ''))
          setError(false)
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className={`mb-3 w-44 rounded-xl border px-4 py-4 text-center text-3xl tracking-[0.4em] ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        autoFocus
      />
      {error && <p className="mb-3 text-sm font-medium text-red-500">Wrong PIN — try again</p>}
      <button
        onClick={submit}
        className="min-h-touch w-44 rounded-xl py-3 text-lg font-bold text-white"
        style={{ background: accent }}
      >
        Unlock
      </button>
      <Link to="/" className="mt-6 text-sm text-slate-400">
        ← Home
      </Link>
    </div>
  )
}
