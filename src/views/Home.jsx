import { Link } from 'react-router-dom'
import { Receipt, BellRing, CookingPot, Settings } from 'lucide-react'

const LINKS = [
  { to: '/cashier', label: 'Cashier', sub: 'Take orders', Icon: Receipt, cls: 'bg-blue-600' },
  { to: '/pickup', label: 'Pickup', sub: 'Assemble & call', Icon: BellRing, cls: 'bg-emerald-600' },
  { to: '/kitchen', label: 'Kitchen', sub: 'Read-only queue', Icon: CookingPot, cls: 'bg-slate-800' },
  { to: '/reports', label: 'Admin', sub: 'Menu & reports', Icon: Settings, cls: 'bg-violet-600' },
]

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900">Stall Orders</h1>
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
