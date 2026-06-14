import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { elapsed } from '../lib/format.js'
import { useOrders, useKeepAwake, useTicker } from '../lib/useOrders.js'
import { Lock, Package, Utensils, Sun, Moon } from 'lucide-react'
import VegDot from '../components/VegDot.jsx'
import PinGate, { lockView } from '../components/PinGate.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'

// Read-only, dark, oversized queue for kitchen staff to glance at.
export default function Kitchen() {
  return (
    <PinGate
      viewKey="kitchen"
      pin={import.meta.env.VITE_KITCHEN_PIN}
      pinHash={import.meta.env.VITE_KITCHEN_PIN_HASH}
      title="Kitchen"
      accent="#0f172a"
    >
      <KitchenView />
    </PinGate>
  )
}

function KitchenView() {
  const { orders, connection } = useOrders()
  const { awake, toggle: toggleAwake } = useKeepAwake()
  useTicker(1000)

  const active = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'active')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [orders],
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 bg-amber-500 px-4 py-3 text-center">
        <p className="text-lg font-black uppercase tracking-widest text-slate-900">
          Kitchen View — Read Only
        </p>
      </header>

      <OfflineBanner connection={connection} />

      <div className="flex items-center justify-between px-4 py-2 text-slate-400">
        <Link to="/" className="text-sm">
          ← Home
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">{active.length} active</span>
          <button
            onClick={toggleAwake}
            className={`p-1 ${awake ? 'text-amber-400' : 'text-slate-500'}`}
            title={awake ? 'Screen stays awake' : 'Screen can sleep'}
          >
            {awake ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => lockView('kitchen')} className="p-1" title="Lock view">
            <Lock size={18} />
          </button>
        </div>
      </div>

      <main className="space-y-3 px-3 pb-8">
        {active.length === 0 && (
          <p className="py-20 text-center text-2xl text-slate-600">No active orders.</p>
        )}
        {active.map((o) => (
          <article key={o.id} className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
            <div className="flex items-baseline justify-between">
              <span className="font-black" style={{ fontSize: 56, lineHeight: 1 }}>
                #{o.order_number}
              </span>
              <span className="flex items-center gap-1.5 text-lg font-semibold text-slate-400">
                {o.order_type === 'parcel' ? <Package size={18} /> : <Utensils size={18} />}
                {elapsed(o.created_at)}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
              {o.items.map((it, idx) => (
                <li
                  key={idx}
                  className={`flex items-center gap-3 rounded-lg border-l-4 px-2 py-1 ${
                    it.veg ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10'
                  }`}
                  style={{ fontSize: 26 }}
                >
                  <VegDot veg={it.veg} size={22} />
                  <span className="font-black text-amber-400">{it.quantity}×</span>
                  <span className="font-semibold">{it.name}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </main>
    </div>
  )
}
