import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Receipt, BellRing, CookingPot, ChevronRight, UtensilsCrossed } from 'lucide-react'

// Admin is intentionally NOT listed — it's hidden (secret gesture below).
const STATIONS = [
  { to: '/cashier', label: 'Cashier', sub: 'Take orders and payments', Icon: Receipt, tint: 'bg-brand-50 text-brand-600' },
  { to: '/pickup', label: 'Pickup', sub: 'Assemble and call numbers', Icon: BellRing, tint: 'bg-emerald-50 text-emerald-600' },
  { to: '/kitchen', label: 'Kitchen', sub: 'Live order queue', Icon: CookingPot, tint: 'bg-sky-50 text-sky-600' },
]

export default function Home() {
  const navigate = useNavigate()
  const taps = useRef(0)
  const timer = useRef(null)

  // Secret admin access: tap the wordmark 5 times quickly.
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
      <header className="mb-10 flex items-center gap-3" onClick={secretTap}>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <UtensilsCrossed size={22} strokeWidth={2.2} />
        </div>
        <div className="select-none">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Stall Orders</h1>
          <p className="text-sm text-slate-500">Festival point of sale</p>
        </div>
      </header>

      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Stations</p>
      <nav className="flex flex-col gap-2.5">
        {STATIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group flex min-h-touch items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 transition-colors active:bg-slate-50"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tint}`}>
              <s.Icon size={20} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{s.label}</p>
              <p className="text-sm text-slate-500">{s.sub}</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-active:text-slate-400" />
          </Link>
        ))}
      </nav>

      <p className="mt-auto pt-10 text-center text-xs text-slate-400">
        Open a station on its device and add it to the home screen.
      </p>
    </div>
  )
}
