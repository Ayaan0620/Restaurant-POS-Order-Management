import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { euro, elapsed, minutesSince, clockTime } from '../lib/format.js'
import { useOrders, useKeepAwake, useUnsyncedGuard, useTicker } from '../lib/useOrders.js'
import { useNewOrderSound } from '../lib/useNewOrderSound.js'
import { Lock, Volume2, Package, Utensils, Check, X, RotateCcw, Sun, Moon } from 'lucide-react'
import VegDot from '../components/VegDot.jsx'
import ConnectionDot from '../components/ConnectionDot.jsx'
import PinGate, { lockView } from '../components/PinGate.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'

const STALE_MINUTES = 15

export default function Pickup() {
  return (
    <PinGate
      viewKey="pickup"
      pin={import.meta.env.VITE_PICKUP_PIN}
      pinHash={import.meta.env.VITE_PICKUP_PIN_HASH}
      title="Pickup"
      accent="#059669"
    >
      <PickupView />
    </PinGate>
  )
}

function PickupView() {
  const { orders, connection, unsyncedCount, collectOrder, voidOrder, reactivateOrder } = useOrders()
  const { awake, toggle: toggleAwake } = useKeepAwake()
  useUnsyncedGuard(unsyncedCount)
  useTicker(1000) // refresh elapsed timers

  const [flashIds, setFlashIds] = useState(() => new Set())
  const [tab, setTab] = useState('active') // 'active' | 'past'
  const [confirmState, setConfirmState] = useState(null) // { kind, order }
  const seenRef = useRef(null) // ids we've already shown (null until first load)

  const active = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'active')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [orders],
  )

  // Bell chime on every new order (on by default — arms on first tap).
  const { soundReady, test } = useNewOrderSound(active)

  // Past = collected or voided, most recently handled first.
  const past = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'active')
        .sort(
          (a, b) =>
            new Date(b.collected_at || b.created_at) - new Date(a.collected_at || a.created_at),
        ),
    [orders],
  )

  function runConfirm() {
    if (!confirmState) return
    const { kind, order } = confirmState
    if (kind === 'void') voidOrder(order.id)
    else if (kind === 'redo') reactivateOrder(order.id)
    setConfirmState(null)
  }

  // Visually flash newly-arrived active order cards (sound is handled by the hook).
  useEffect(() => {
    const ids = new Set(active.map((o) => o.id))
    if (seenRef.current === null) {
      seenRef.current = ids // first render: don't flash existing orders
      return
    }
    const fresh = [...ids].filter((id) => !seenRef.current.has(id))
    seenRef.current = ids
    if (fresh.length > 0) {
      setFlashIds(new Set(fresh))
      const t = setTimeout(() => setFlashIds(new Set()), 1400)
      return () => clearTimeout(t)
    }
  }, [active])

  return (
    <div className="min-h-screen bg-slate-100 pb-6">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Link to="/" className="text-sm font-medium text-slate-500">
          ← Home
        </Link>
        <h1 className="text-lg font-bold text-slate-900">
          Pickup <span className="text-slate-400">({active.length})</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={test}
            className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700"
            title="Test the alert sound"
          >
            <Volume2 size={16} /> Test
          </button>
          <button
            onClick={toggleAwake}
            className={`p-1 ${awake ? 'text-amber-500' : 'text-slate-400'}`}
            title={awake ? 'Screen stays awake (tap to allow sleep)' : 'Screen can sleep (tap to keep awake)'}
          >
            {awake ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <ConnectionDot connection={connection} unsyncedCount={unsyncedCount} />
          <button onClick={() => lockView('pickup')} className="p-1 text-slate-500" title="Lock view">
            <Lock size={20} />
          </button>
        </div>
      </header>

      <OfflineBanner connection={connection} />

      {!soundReady && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-800">
          Tap anywhere to turn on the new-order sound
        </div>
      )}

      {/* Active / Past tabs */}
      <div className="sticky top-[57px] z-10 flex gap-2 bg-slate-100 px-3 py-2">
        <TabBtn active={tab === 'active'} onClick={() => setTab('active')}>
          Active ({active.length})
        </TabBtn>
        <TabBtn active={tab === 'past'} onClick={() => setTab('past')}>
          Past ({past.length})
        </TabBtn>
      </div>

      {tab === 'active' ? (
        <main className="space-y-3 px-3 py-4">
          {active.length === 0 && (
            <p className="py-16 text-center text-lg text-slate-400">No active orders.</p>
          )}
          {active.map((o) => {
            const stale = minutesSince(o.created_at) >= STALE_MINUTES
            const flash = flashIds.has(o.id)
            return (
              <article
                key={o.id}
                className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
                  stale ? 'border-red-500 bg-amber-50' : 'border-transparent'
                } ${flash ? 'animate-order-flash' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="leading-none">
                    <span className="font-black text-slate-900" style={{ fontSize: 64, lineHeight: 1 }}>
                      #{o.order_number}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
                        o.order_type === 'parcel'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {o.order_type === 'parcel' ? <Package size={14} /> : <Utensils size={14} />}
                      {o.order_type === 'parcel' ? 'Parcel' : 'Dine-in'}
                    </span>
                    <p className={`mt-1 text-sm font-semibold ${stale ? 'text-red-600' : 'text-slate-500'}`}>
                      {elapsed(o.created_at)} ago
                    </p>
                    <p className="text-xs text-slate-400">{clockTime(o.created_at)}</p>
                  </div>
                </div>

                <ItemList items={o.items} />

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <button
                    onClick={() => collectOrder(o.id)}
                    className="col-span-3 flex min-h-touch items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-xl font-bold text-white active:bg-emerald-700"
                  >
                    <Check size={24} /> Collected
                  </button>
                  <button
                    onClick={() => setConfirmState({ kind: 'void', order: o })}
                    className="min-h-touch rounded-xl bg-slate-100 py-4 text-base font-bold text-red-600 active:bg-red-50"
                  >
                    Void
                  </button>
                </div>
              </article>
            )
          })}
        </main>
      ) : (
        <main className="space-y-3 px-3 py-4">
          {past.length === 0 && (
            <p className="py-16 text-center text-lg text-slate-400">No past orders yet.</p>
          )}
          {past.map((o) => (
            <article
              key={o.id}
              className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
                o.status === 'voided' ? 'border-red-200 opacity-80' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-black text-slate-700" style={{ fontSize: 48, lineHeight: 1 }}>
                  #{o.order_number}
                </span>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
                      o.status === 'collected'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {o.status === 'collected' ? <Check size={14} /> : <X size={14} />}
                    {o.status === 'collected' ? 'Collected' : 'Voided'}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">
                    {o.collected_at ? clockTime(o.collected_at) : clockTime(o.created_at)}
                  </p>
                </div>
              </div>

              <ItemList items={o.items} muted />

              <button
                onClick={() => setConfirmState({ kind: 'redo', order: o })}
                className="mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-base font-bold text-white active:bg-amber-600"
              >
                <RotateCcw size={18} /> Redo (back to active)
              </button>
            </article>
          ))}
        </main>
      )}

      <ConfirmDialog
        open={!!confirmState}
        danger={confirmState?.kind === 'void'}
        title={
          confirmState?.kind === 'void'
            ? `Void order #${confirmState?.order.order_number}?`
            : `Redo order #${confirmState?.order.order_number}?`
        }
        message={
          confirmState?.kind === 'void'
            ? 'This cancels the order. It moves to Past and is excluded from sales totals.'
            : 'Are you sure you want to redo this? It will move back to the active queue.'
        }
        confirmLabel={confirmState?.kind === 'void' ? 'Void order' : 'Yes, redo'}
        onConfirm={runConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-touch flex-1 rounded-xl px-4 py-2 text-base font-bold ${
        active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function ItemList({ items, muted }) {
  return (
    <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
      {items.map((it, idx) => (
        <li
          key={idx}
          className={`flex items-center gap-2 rounded-lg border-l-4 px-2 py-1 text-lg ${
            it.veg ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
          } ${muted ? 'opacity-80' : ''}`}
        >
          <VegDot veg={it.veg} size={18} />
          <span className="font-bold text-slate-900">{it.quantity}×</span>
          <span className="text-slate-800">{it.name}</span>
        </li>
      ))}
    </ul>
  )
}
