import { useState } from 'react'
import { Link } from 'react-router-dom'
import { acceptableCreds } from '../lib/pins.js'

// Per-view PIN gate with a privilege hierarchy (see lib/pins.js):
// a view is opened by its own role PIN or any higher role's PIN.
// If no PIN is configured for the view's level or above, the view is open.
//
// PINs are stored as SHA-256 hashes (preferred) so no plaintext ships in the
// bundle. This gates the UI only — deterrence, not strong security.

const storageKey = (viewKey) => `pin_ok_${viewKey}`

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function isUnlocked(viewKey, creds) {
  if (creds.length === 0) return true // nothing configured -> open
  try {
    const saved = localStorage.getItem(storageKey(viewKey))
    return creds.some((c) => c.token === saved)
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

export default function PinGate({ viewKey, title, accent = '#2563eb', children }) {
  const creds = acceptableCreds(viewKey)
  const [ok, setOk] = useState(() => isUnlocked(viewKey, creds))
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  if (ok) return children

  async function submit() {
    if (creds.length === 0 || checking || entry === '') return
    setChecking(true)
    try {
      const hashedEntry = await sha256Hex(entry)
      const match = creds.find((c) => (c.hashed ? hashedEntry === c.token : entry === c.token))
      if (match) {
        try {
          localStorage.setItem(storageKey(viewKey), match.token)
        } catch {
          /* ignore */
        }
        setOk(true)
      } else {
        setError(true)
        setEntry('')
      }
    } finally {
      setChecking(false)
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
        disabled={checking}
        className="min-h-touch w-44 rounded-xl py-3 text-lg font-bold text-white disabled:opacity-60"
        style={{ background: accent }}
      >
        {checking ? 'Checking…' : 'Unlock'}
      </button>
      <Link to="/" className="mt-6 text-sm text-slate-400">
        ← Home
      </Link>
    </div>
  )
}
