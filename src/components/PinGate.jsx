import { useState } from 'react'
import { Link } from 'react-router-dom'

// Per-view PIN gate.
//
// SECURITY: prefer the *hashed* form. Each view can be configured with either:
//   - VITE_<VIEW>_PIN_HASH : the SHA-256 hex of the PIN (recommended — no
//                            plaintext password ends up in the shipped bundle)
//   - VITE_<VIEW>_PIN      : the plaintext PIN (simple, but readable in source)
// If neither is set, the view is open (no gate).
//
// Generate a hash with:  npm run hash-pin -- 1234
//
// Note: this gates the UI only. It is deterrence, not strong security — see the
// README "Security" section. For true protection use a real login.

const storageKey = (viewKey) => `pin_ok_${viewKey}`

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// The "expected" token we compare against: the hash if configured, else the
// plaintext PIN, else null (open).
function expectedToken({ pin, pinHash }) {
  if (pinHash) return String(pinHash).trim().toLowerCase()
  if (pin) return String(pin)
  return null
}

function isUnlocked(viewKey, token) {
  if (!token) return true // no PIN configured -> open
  try {
    return localStorage.getItem(storageKey(viewKey)) === token
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

export default function PinGate({ viewKey, pin, pinHash, title, accent = '#2563eb', children }) {
  const token = expectedToken({ pin, pinHash })
  const hashed = Boolean(pinHash)
  const [ok, setOk] = useState(() => isUnlocked(viewKey, token))
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  if (ok) return children

  async function submit() {
    if (!token || checking) return
    setChecking(true)
    try {
      const candidate = hashed ? await sha256Hex(entry) : entry
      if (candidate === token && entry !== '') {
        try {
          localStorage.setItem(storageKey(viewKey), token)
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
