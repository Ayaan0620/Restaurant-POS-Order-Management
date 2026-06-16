import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_ORDER } from '../menu.config.js'
import { euro, todayISO, clockTime, parseDecimal } from '../lib/format.js'
import { useOrders, useKeepAwake, useUnsyncedGuard } from '../lib/useOrders.js'
import { useMenu } from '../lib/useMenu.js'
import {
  Lock,
  Banknote,
  CreditCard,
  Utensils,
  Package,
  Minus,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react'
import VegDot from '../components/VegDot.jsx'
import ConnectionDot from '../components/ConnectionDot.jsx'
import PinGate, { lockView } from '../components/PinGate.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'

const PRESETS = [5, 10, 20, 50] // change-calculator cash denominations
const DISCOUNTS = [5, 10, 15, 20] // discount % quick buttons
const CARD_FEE_RATE = 0.02 // 2% card cost — for REPORTING only, NOT charged to the customer
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// Group the live menu by category (ordered), splitting each category into a
// veg column (left) and a non-veg column (right).
function useGroupedMenu(menu) {
  return useMemo(() => {
    const groups = {}
    for (const item of menu) {
      ;(groups[item.category] ||= []).push(item)
    }
    const ordered = [...CATEGORY_ORDER.filter((c) => groups[c])]
    for (const c of Object.keys(groups)) if (!ordered.includes(c)) ordered.push(c)
    return ordered.map((c) => ({
      category: c,
      veg: groups[c].filter((i) => i.veg),
      nonveg: groups[c].filter((i) => !i.veg),
    }))
  }, [menu])
}

export default function Cashier() {
  return (
    <PinGate
      viewKey="cashier"
      pin={import.meta.env.VITE_CASHIER_PIN}
      pinHash={import.meta.env.VITE_CASHIER_PIN_HASH}
      title="Cashier"
      accent="#ea580c"
    >
      <CashierView />
    </PinGate>
  )
}

function CashierView() {
  const { createOrder, orders, nextOrderNumber, connection, unsyncedCount } = useOrders()
  const { menu } = useMenu()
  const { awake, toggle: toggleAwake } = useKeepAwake()
  useUnsyncedGuard(unsyncedCount)

  // Today's orders, newest first — for the "last sticky-note number" + history.
  const today = todayISO()
  const todaysOrders = useMemo(
    () =>
      orders
        .filter((o) => o.date === today)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [orders, today],
  )
  const lastNumber = todaysOrders[0]?.order_number || null
  const nextNumber = nextOrderNumber(today)

  const grouped = useGroupedMenu(menu)
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState('dinein')
  const [payment, setPayment] = useState('cash') // 'cash' | 'card'
  const [discountPct, setDiscountPct] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tab, setTab] = useState('cart')
  const [tendered, setTendered] = useState('') // raw text, may use a comma decimal
  const [overlay, setOverlay] = useState(null)
  const [sending, setSending] = useState(false)

  // ---- Money math ----
  // The customer pays the same whether cash or card. The 2% card fee is a COST
  // tracked per order for the reports (net profit) — it is NOT added to the total.
  const gross = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart])
  const pct = Math.min(100, Math.max(0, Number(discountPct) || 0))
  const discountAmt = round2(gross * (pct / 100))
  const subtotal = round2(gross - discountAmt)
  const total = subtotal // what the customer actually pays
  const cardFee = payment === 'card' ? round2(subtotal * CARD_FEE_RATE) : 0
  const count = cart.reduce((s, i) => s + i.quantity, 0)

  function addItem(item) {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.name === item.name)
      if (i === -1) return [...prev, { ...item, quantity: 1 }]
      const next = [...prev]
      next[i] = { ...next[i], quantity: next[i].quantity + 1 }
      return next
    })
  }
  function changeQty(name, delta) {
    setCart((prev) =>
      prev
        .map((x) => (x.name === name ? { ...x, quantity: x.quantity + delta } : x))
        .filter((x) => x.quantity > 0),
    )
  }
  function removeItem(name) {
    setCart((prev) => prev.filter((x) => x.name !== name))
  }
  function resetOrder() {
    setCart([])
    setTendered('')
    setOrderType('dinein')
    setPayment('cash')
    setDiscountPct(0)
    setTab('cart')
    setSheetOpen(false)
  }

  async function sendOrder() {
    if (cart.length === 0 || sending) return
    setSending(true)
    try {
      const order = await createOrder({
        items: cart.map(({ name, price, quantity, veg }) => ({ name, price, quantity, veg })),
        total,
        subtotal,
        discount_pct: pct,
        vat: cardFee, // stored as the card cost for reporting (not charged)
        payment_method: payment,
        order_type: orderType,
      })
      setOverlay(order.order_number)
      resetOrder()
      setTimeout(() => setOverlay(null), 3000)
    } finally {
      setSending(false)
    }
  }

  const tenderedNum = parseDecimal(tendered)
  const change = tenderedNum - total

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-medium text-slate-500">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Cashier</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAwake}
              className={`p-1 ${awake ? 'text-amber-500' : 'text-slate-400'}`}
              title={awake ? 'Screen stays awake (tap to allow sleep)' : 'Screen can sleep (tap to keep awake)'}
            >
              {awake ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <ConnectionDot connection={connection} unsyncedCount={unsyncedCount} />
            <button onClick={() => lockView('cashier')} className="p-1 text-slate-500" title="Lock view">
              <Lock size={20} />
            </button>
          </div>
        </div>
        {/* Sticky-note number bar */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm">
          <span className="text-slate-500">
            Last note: <b className="text-slate-900">#{lastNumber || '—'}</b>
          </span>
          <span className="text-slate-500">
            Next: <b className="text-brand-600">#{nextNumber}</b>
          </span>
          <button
            onClick={() => {
              setTab('history')
              setSheetOpen(true)
            }}
            className="font-bold text-brand-600"
          >
            History ({todaysOrders.length})
          </button>
        </div>
      </header>

      <OfflineBanner connection={connection} />

      {/* Non-veg (left) vs Veg (right) column headers */}
      <div className="grid grid-cols-2 gap-2 px-3 pt-3">
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-red-700">
          <VegDot veg={false} size={14} /> Non-veg
        </p>
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700">
          <VegDot veg={true} size={14} /> Veg
        </p>
      </div>

      <main className="px-3 py-3">
        {grouped.map(({ category, veg, nonveg }) => (
          <section key={category} className="mb-5">
            <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-slate-500">
              {category}
            </h2>
            {/* Left column = non-veg, right column = veg */}
            <div className="grid grid-cols-2 items-start gap-2">
              <div className="space-y-2">
                {nonveg.map((item) => (
                  <MenuButton key={item.id} item={item} onAdd={addItem} />
                ))}
              </div>
              <div className="space-y-2">
                {veg.map((item) => (
                  <MenuButton key={item.id} item={item} onAdd={addItem} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>

      <BottomSheet
        open={sheetOpen}
        onToggle={() => setSheetOpen((o) => !o)}
        onClose={() => setSheetOpen(false)}
        count={count}
        total={total}
      >
        <div className="flex gap-2 px-4 pt-3">
          <TabButton active={tab === 'cart'} onClick={() => setTab('cart')}>
            Order
          </TabButton>
          <TabButton active={tab === 'change'} onClick={() => setTab('change')}>
            Change
          </TabButton>
          <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
            History
          </TabButton>
        </div>

        {tab === 'cart' && (
          <CartPanel
            cart={cart}
            gross={gross}
            pct={pct}
            discountAmt={discountAmt}
            subtotal={subtotal}
            cardFee={cardFee}
            total={total}
            payment={payment}
            setPayment={setPayment}
            discountPct={discountPct}
            setDiscountPct={setDiscountPct}
            orderType={orderType}
            setOrderType={setOrderType}
            changeQty={changeQty}
            removeItem={removeItem}
            sendOrder={sendOrder}
            sending={sending}
          />
        )}
        {tab === 'change' && (
          <ChangePanel
            total={total}
            tendered={tendered}
            tenderedNum={tenderedNum}
            setTendered={setTendered}
            change={change}
          />
        )}
        {tab === 'history' && <HistoryPanel orders={todaysOrders} />}
      </BottomSheet>

      {overlay && (
        <button
          onClick={() => setOverlay(null)}
          className="fixed inset-0 z-50 flex w-full flex-col items-center justify-center bg-brand-600 text-white"
          aria-label="Dismiss order number"
        >
          <p className="text-2xl font-semibold uppercase tracking-widest text-brand-100">Order</p>
          <p className="text-[34vw] font-black leading-none">#{overlay}</p>
          <p className="mt-4 text-lg text-brand-100">Write this on the sticky note</p>
          <p className="mt-6 text-sm text-brand-200">Tap anywhere to dismiss</p>
        </button>
      )}
    </div>
  )
}

function BottomSheet({ open, onToggle, onClose, count, total, children }) {
  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop — tap outside the sheet to close it. */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30"
          onClick={onClose}
          role="presentation"
          aria-hidden="true"
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-30">
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Current order"
            className="max-h-[78vh] overflow-y-auto rounded-t-2xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {children}
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex min-h-touch w-full items-center justify-between bg-slate-900 px-5 py-4 text-white"
          style={{ paddingBottom: open ? 16 : 'calc(16px + env(safe-area-inset-bottom))' }}
        >
          <span className="flex items-center gap-3">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
              {count} item{count === 1 ? '' : 's'}
            </span>
            <span className="text-xl font-bold">{euro(total)}</span>
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-slate-300">
            {open ? 'Close' : 'Open order'}
            {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </span>
        </button>
      </div>
    </>
  )
}

function MenuButton({ item, onAdd }) {
  return (
    <button
      onClick={() => onAdd(item)}
      className={`flex min-h-touch w-full flex-col items-start gap-1 rounded-xl border-l-4 p-3 text-left shadow-sm ring-1 active:opacity-80 ${
        item.veg
          ? 'border-emerald-500 bg-emerald-50 ring-emerald-200'
          : 'border-red-500 bg-red-50 ring-red-200'
      }`}
    >
      <div className="flex w-full items-start justify-between gap-1">
        <span className="text-[15px] font-semibold leading-tight text-slate-900">{item.name}</span>
        <VegDot veg={item.veg} />
      </div>
      <span className="text-sm font-bold text-slate-600">{euro(item.price)}</span>
    </button>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-touch flex-1 rounded-xl px-4 py-2 text-base font-bold ${
        active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}

function CartPanel({
  cart, gross, pct, discountAmt, subtotal, cardFee, total,
  payment, setPayment, discountPct, setDiscountPct,
  orderType, setOrderType, changeQty, removeItem, sendOrder, sending,
}) {
  return (
    <div className="px-4 py-3">
      {cart.length === 0 ? (
        <p className="py-8 text-center text-slate-400">Tap menu items to add them.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {cart.map((i) => (
            <li key={i.name} className="flex items-center gap-2 py-2">
              <VegDot veg={i.veg} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{i.name}</p>
                <p className="text-sm text-slate-500">
                  {euro(i.price)} × {i.quantity} ={' '}
                  <span className="font-semibold">{euro(i.price * i.quantity)}</span>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <QtyBtn onClick={() => changeQty(i.name, -1)}>
                  <Minus size={20} />
                </QtyBtn>
                <span className="w-7 text-center text-lg font-bold">{i.quantity}</span>
                <QtyBtn onClick={() => changeQty(i.name, +1)}>
                  <Plus size={20} />
                </QtyBtn>
                <button
                  onClick={() => removeItem(i.name)}
                  className="ml-1 flex h-11 w-11 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
                  aria-label={`Remove ${i.name}`}
                >
                  <X size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Discount */}
      <p className="mt-4 text-sm font-medium text-slate-500">Discount %</p>
      <div className="mt-1 grid grid-cols-5 gap-2">
        {DISCOUNTS.map((d) => (
          <button
            key={d}
            onClick={() => setDiscountPct(pct === d ? 0 : d)}
            className={`min-h-touch rounded-xl py-3 text-base font-bold ${
              pct === d ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {d}%
          </button>
        ))}
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="100"
          value={discountPct || ''}
          onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
          placeholder="0"
          className="min-h-touch w-full rounded-xl border border-slate-300 text-center text-base font-bold"
          aria-label="Custom discount percent"
        />
      </div>

      {/* Payment method */}
      <p className="mt-4 text-sm font-medium text-slate-500">Payment</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <SegBtn active={payment === 'cash'} onClick={() => setPayment('cash')}>
          <Banknote size={18} /> Cash
        </SegBtn>
        <SegBtn active={payment === 'card'} onClick={() => setPayment('card')}>
          <CreditCard size={18} /> Card
        </SegBtn>
      </div>

      {/* Dine-in / Parcel */}
      <p className="mt-4 text-sm font-medium text-slate-500">Type</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <SegBtn active={orderType === 'dinein'} onClick={() => setOrderType('dinein')}>
          <Utensils size={18} /> Dine-in
        </SegBtn>
        <SegBtn active={orderType === 'parcel'} onClick={() => setOrderType('parcel')}>
          <Package size={18} /> Parcel
        </SegBtn>
      </div>

      {/* Money breakdown */}
      <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-slate-600">
        <Row label="Items" value={euro(gross)} />
        {pct > 0 && <Row label={`Discount (${pct}%)`} value={`− ${euro(discountAmt)}`} strong="text-rose-600" />}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
        <span className="text-lg font-medium text-slate-600">Total to pay</span>
        <span className="text-3xl font-black text-slate-900">{euro(total)}</span>
      </div>
      {cardFee > 0 && (
        <p className="mt-1 text-right text-xs text-slate-400">
          Card fee {euro(cardFee)} (your cost, not charged to customer)
        </p>
      )}

      <button
        onClick={sendOrder}
        disabled={cart.length === 0 || sending}
        className="mt-3 min-h-touch w-full rounded-xl bg-brand-600 py-4 text-xl font-bold text-white disabled:bg-slate-300 active:bg-brand-700"
      >
        {sending ? 'Sending…' : 'Send Order'}
      </button>
    </div>
  )
}

function ChangePanel({ total, tendered, tenderedNum, setTendered, change }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-lg text-slate-600">Order total</span>
        <span className="text-2xl font-bold text-slate-900">{euro(total)}</span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">Customer hands over</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setTendered(String(p))}
            className={`min-h-touch rounded-xl py-3 text-lg font-bold ${
              tenderedNum === p ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            €{p}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-sm font-medium text-slate-500">Custom amount</label>
      <input
        type="text"
        inputMode="decimal"
        value={tendered}
        onChange={(e) => setTendered(e.target.value)}
        placeholder="0,00"
        className="mt-1 min-h-touch w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl font-bold"
      />
      <div className="mt-4 rounded-xl bg-slate-900 p-5 text-center text-white">
        <p className="text-sm uppercase tracking-widest text-slate-400">Change due</p>
        <p className={`text-5xl font-black ${change < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {euro(Math.abs(change))}
        </p>
        {change < 0 && tenderedNum > 0 && (
          <p className="mt-1 text-sm text-amber-300">Short by this amount</p>
        )}
      </div>
    </div>
  )
}

function HistoryPanel({ orders }) {
  if (orders.length === 0) {
    return <p className="px-4 py-8 text-center text-slate-400">No orders yet today.</p>
  }
  const statusColor = {
    active: 'text-sky-600',
    collected: 'text-emerald-600',
    voided: 'text-red-500 line-through',
  }
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-sm text-slate-500">Today's orders — newest first</p>
      <ul className="divide-y divide-slate-100">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2.5">
            <span className="w-16 shrink-0 text-2xl font-black text-slate-900">#{o.order_number}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-600">
                {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') || '—'}
              </p>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                {clockTime(o.created_at)} ·
                {o.payment_method === 'card' ? <CreditCard size={13} /> : <Banknote size={13} />}
                {o.payment_method === 'card' ? 'Card' : 'Cash'} ·
                <span className={`font-semibold ${statusColor[o.status] || ''}`}>{o.status}</span>
              </p>
            </div>
            <span className="shrink-0 font-bold text-slate-900">{euro(o.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={`font-semibold ${strong || 'text-slate-700'}`}>{value}</span>
    </div>
  )
}

function QtyBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 active:bg-slate-200"
    >
      {children}
    </button>
  )
}

function SegBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-touch items-center justify-center gap-2 rounded-xl py-3 text-base font-bold ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}
