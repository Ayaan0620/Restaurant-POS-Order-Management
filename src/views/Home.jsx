import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Receipt, BellRing, CookingPot } from 'lucide-react'

// Admin is intentionally NOT listed here — it's hidden (see secret gesture below).
const LINKS = [
  { to: '/cashier', label: 'Cashier', sub: 'Take orders', Icon: Receipt, cls: 'bg-blue-600' },
  { to: '/pickup', label: 'Pickup', sub: 'Assemble & call', Icon: BellRing, cls: 'bg-emerald-600' },
  { to: '/kitchen', label: 'Kitchen', sub: 'Read-only queue', Icon: CookingPot, cls: 'bg-slate-800' },
]

export default function Home() {
  const navigate = useNavigate()
  const taps = useRef(0)
  const timer = useRef(null)

  // Secret admin access: tap the title 5 times quickly. Nothing on screen hints
  // at it, so staff/customers never stumble into the owner's reports.
  function secretTap() {
    taps.current += 1
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      taps.current = 0
    }, 1500)
    if (taps.current >= 5) {
      taps.current = 0
      navigate('/reports')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      <header className="mb-8 text-center">
        <h1
          className="cursor-default select-none text-3xl font-extrabold text-slate-900"
          onClick={secretTap}
          title=""
        >
          Stall Orders
        </h1>
        <p className="mt-1 text-slate-500">Bookmark a view on each device</p>
      </header>

      <nav className="grid gap-4">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`flex min-h-touch items-center gap-4 rounded-2xl ${l.cls} px-6 py-6 text-white shadow-lg active:opacity-90`}
          >
            <l.Icon size={36} strokeWidth={2} />
            <span className="flex flex-col">
              <span className="text-2xl font-bold">{l.label}</span>
              <span className="text-sm text-white/80">{l.sub}</span>
            </span>
          </Link>
        ))}
      </nav>

      <p className="mt-auto pt-8 text-center text-xs text-slate-400">
        Each view has its own URL — open it on the right device and bookmark it.
      </p>
    </div>
  )
}
