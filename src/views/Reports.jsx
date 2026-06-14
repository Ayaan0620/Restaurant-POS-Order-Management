import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Lock, BarChart3, UtensilsCrossed, Wallet, Banknote, CreditCard, Trash2, Plus, Check,
} from 'lucide-react'
import { euro, todayISO, clockTime } from '../lib/format.js'
import { useOrders } from '../lib/useOrders.js'
import { useMenu } from '../lib/useMenu.js'
import { blankItem } from '../lib/menuStore.js'
import { useExpenses } from '../lib/useExpenses.js'
import { blankExpense, totalExpenses } from '../lib/expensesStore.js'
import menu from '../menu.config.js'
import VegDot from '../components/VegDot.jsx'
import PinGate, { lockView } from '../components/PinGate.jsx'

// item name -> category, for the revenue-by-category breakdown.
const ITEM_CATEGORY = Object.fromEntries(menu.map((m) => [m.name, m.category]))
const findCategory = (name) => ITEM_CATEGORY[name] || 'Other'

export default function Reports() {
  return (
    <PinGate
      viewKey="reports"
      pin={import.meta.env.VITE_REPORTS_PIN}
      pinHash={import.meta.env.VITE_REPORTS_PIN_HASH}
      title="Admin"
      accent="#ea580c"
    >
      <AdminView />
    </PinGate>
  )
}

function AdminView() {
  const [tab, setTab] = useState('reports')
  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link to="/" className="text-sm font-medium text-slate-500">
          ← Home
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Admin</h1>
        <button onClick={() => lockView('reports')} className="p-1 text-slate-500" title="Lock view">
          <Lock size={20} />
        </button>
      </header>
      <div className="sticky top-[57px] z-10 flex gap-2 bg-slate-100 px-3 py-2">
        <AdminTab active={tab === 'reports'} onClick={() => setTab('reports')}>
          <BarChart3 size={18} /> Reports
        </AdminTab>
        <AdminTab active={tab === 'menu'} onClick={() => setTab('menu')}>
          <UtensilsCrossed size={18} /> Menu
        </AdminTab>
        <AdminTab active={tab === 'expenses'} onClick={() => setTab('expenses')}>
          <Wallet size={18} /> Costs
        </AdminTab>
      </div>
      {tab === 'reports' && <ReportsBody />}
      {tab === 'menu' && <MenuEditor />}
      {tab === 'expenses' && <ExpensesEditor />}
    </div>
  )
}

function AdminTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-bold ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function ReportsBody() {
  const { orders } = useOrders()
  const { expenses } = useExpenses()
  const [date, setDate] = useState(todayISO())

  const dayOrders = useMemo(
    () =>
      orders
        .filter((o) => o.date === date)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [orders, date],
  )
  const stats = useMemo(() => computeStats(dayOrders), [dayOrders])

  // Break-even is all-time: net earned across every day vs total costs.
  const breakEven = useMemo(() => {
    let net = 0
    for (const o of orders) {
      if (o.status === 'voided') continue
      net += (Number(o.total) || 0) - (Number(o.vat) || 0)
    }
    const costs = totalExpenses(expenses)
    return { net, costs }
  }, [orders, expenses])

  return (
    <div className="px-4 py-4">
        {/* Break-even tracker (all-time) */}
        <BreakEven net={breakEven.net} costs={breakEven.costs} />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-touch flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base font-semibold"
          />
          <button
            onClick={() => exportCSV(dayOrders, date)}
            disabled={dayOrders.length === 0}
            className="min-h-touch rounded-xl bg-brand-600 px-4 py-3 font-bold text-white disabled:bg-slate-300"
          >
            Export CSV
          </button>
        </div>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Orders" value={stats.totalOrders} />
          <Stat label="Revenue" value={euro(stats.revenue)} hint="customers paid" />
          <Stat label="Avg order" value={euro(stats.avgOrder)} />
          <Stat label="Discounts given" value={euro(stats.discountGiven)} accent="text-rose-600" />
        </div>

        {/* Net profit breakdown */}
        <Section title="Net (after card fees)">
          <div className="space-y-1 text-slate-600">
            <LineRow label="Revenue (collected)" value={euro(stats.revenue)} />
            <LineRow
              label="Card fees (2% on card sales)"
              value={`− ${euro(stats.cardFees)}`}
              strong="text-amber-600"
            />
            <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-lg font-bold text-slate-700">Net</span>
              <span className="text-2xl font-black text-emerald-600">{euro(stats.net)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Card fee is your processing cost, not charged to customers. (Net does not yet
            subtract cost of ingredients.)
          </p>
        </Section>

        {/* Cash vs Card */}
        <Section title="Cash vs Card (revenue)">
          <div className="flex items-center gap-4">
            <Donut
              segments={[
                { label: 'Cash', value: stats.cash.revenue, color: '#16a34a' },
                { label: 'Card', value: stats.card.revenue, color: '#7c3aed' },
              ]}
            />
            <div className="flex-1 space-y-2 text-sm">
              <MiniCard
                title={<span className="flex items-center gap-1.5"><Banknote size={15} /> Cash</span>}
                rows={[['Orders', stats.cash.count], ['Revenue', euro(stats.cash.revenue)]]}
              />
              <MiniCard
                title={<span className="flex items-center gap-1.5"><CreditCard size={15} /> Card</span>}
                rows={[
                  ['Orders', stats.card.count],
                  ['Revenue', euro(stats.card.revenue)],
                  ['Fee cost', euro(stats.cardFees)],
                ]}
              />
            </div>
          </div>
        </Section>

        {/* Cumulative revenue trend */}
        <Section title="Revenue through the day">
          <LineChart data={stats.cumulative} format={euro} />
        </Section>

        {/* Sales by 30-min slot (with order counts) */}
        <Section title="Busiest times (sales per 30 min)">
          <BarChart
            data={stats.buckets.map((b) => ({ label: b.label, value: b.revenue, sub: `${b.count}` }))}
            color="#0ea5e9"
            format={euro}
          />
          <p className="mt-1 text-xs text-slate-400">Bar = € sold · small number = orders</p>
        </Section>

        {/* Order mix — two compact bars, no redundant donut */}
        <Section title="Order mix">
          <p className="mb-1 text-sm font-semibold text-slate-600">Dine-in vs Parcel (orders)</p>
          <SplitBar
            segments={[
              { label: 'Dine-in', value: stats.dinein, color: '#0ea5e9' },
              { label: 'Parcel', value: stats.parcel, color: '#f97316' },
            ]}
          />
          <p className="mb-1 mt-4 text-sm font-semibold text-slate-600">Veg vs Non-veg (items)</p>
          <SplitBar
            segments={[
              { label: 'Veg', value: stats.vegQty, color: '#16a34a' },
              { label: 'Non-veg', value: stats.nonvegQty, color: '#dc2626' },
            ]}
          />
        </Section>

        {/* Top sellers — visual bars ranked by quantity */}
        <Section title="Top sellers">
          {stats.bestSellers.length === 0 ? (
            <Empty />
          ) : (
            <BarList
              rows={stats.bestSellers.slice(0, 8).map((b) => ({
                label: b.name,
                value: b.qty,
                veg: b.veg,
                note: euro(b.revenue),
              }))}
              format={(v) => `${v} sold`}
            />
          )}
        </Section>

        {/* Revenue by category */}
        <Section title="Revenue by category">
          <BarList rows={stats.categoryRevenue} format={euro} />
        </Section>

        {/* Order log */}
        <Section title={`Order log (${dayOrders.length})`}>
          {stats.voided > 0 && (
            <p className="mb-2 text-sm text-slate-500">
              {stats.voided} voided order{stats.voided === 1 ? '' : 's'} excluded from totals.
            </p>
          )}
          {dayOrders.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">Items</th>
                    <th className="py-1 pr-2 text-right">Total</th>
                    <th className="py-1 pr-2">Pay</th>
                    <th className="py-1 pr-2">Time</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dayOrders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100 align-top">
                      <td className="py-2 pr-2 font-bold">{o.order_number}</td>
                      <td className="py-2 pr-2 text-slate-600">
                        {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                        {Number(o.discount_pct) > 0 && (
                          <span className="ml-1 text-rose-500">(−{o.discount_pct}%)</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold">{euro(o.total)}</td>
                      <td className="py-2 pr-2 text-slate-500">
                        {o.payment_method === 'card' ? <CreditCard size={15} /> : <Banknote size={15} />}
                      </td>
                      <td className="py-2 pr-2 text-slate-500">{clockTime(o.created_at)}</td>
                      <td className="py-2">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
    </div>
  )
}

// ---- Stats ----------------------------------------------------------------

function discountAmount(o) {
  const pct = Number(o.discount_pct) || 0
  const sub = Number(o.subtotal ?? o.total) || 0
  if (pct <= 0 || pct >= 100) return 0
  const gross = sub / (1 - pct / 100)
  return gross - sub
}

function computeStats(dayOrders) {
  const valid = dayOrders.filter((o) => o.status !== 'voided')
  const buckets = new Array(48).fill(null).map((_, i) => ({
    idx: i,
    label: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
    count: 0,
    revenue: 0,
  }))
  const sellers = new Map()
  const categories = new Map()
  const cash = { count: 0, revenue: 0 }
  const card = { count: 0, revenue: 0 }
  let revenue = 0, cardFees = 0, discountGiven = 0
  let parcel = 0, dinein = 0, vegQty = 0, nonvegQty = 0
  let voided = 0

  for (const o of dayOrders) {
    if (o.status === 'voided') { voided += 1; continue }
    const total = Number(o.total) || 0
    revenue += total
    cardFees += Number(o.vat) || 0 // 2% card cost (reporting only)
    discountGiven += discountAmount(o)

    const d = new Date(o.created_at)
    const bi = d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0)
    if (buckets[bi]) { buckets[bi].count += 1; buckets[bi].revenue += total }

    if (o.payment_method === 'card') { card.count += 1; card.revenue += total }
    else { cash.count += 1; cash.revenue += total }

    if (o.order_type === 'parcel') parcel += 1
    else dinein += 1

    for (const it of o.items || []) {
      const cur = sellers.get(it.name) || { name: it.name, qty: 0, veg: it.veg, revenue: 0 }
      cur.qty += it.quantity
      cur.revenue += it.price * it.quantity
      sellers.set(it.name, cur)
      if (it.veg) vegQty += it.quantity
      else nonvegQty += it.quantity
    }
  }

  // Category revenue uses item gross (menu-level), good enough for a breakdown.
  for (const s of sellers.values()) {
    const cat = findCategory(s.name)
    categories.set(cat, (categories.get(cat) || 0) + s.revenue)
  }

  const bestSellers = [...sellers.values()].sort((a, b) => b.qty - a.qty)
  const categoryRevenue = [...categories.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const activeBuckets = buckets.filter((b) => b.count > 0)
  // Cumulative revenue through the day, for the trend line.
  let running = 0
  const cumulative = activeBuckets.map((b) => {
    running += b.revenue
    return { label: b.label, value: running }
  })

  return {
    totalOrders: valid.length,
    revenue,
    cardFees,
    net: revenue - cardFees,
    discountGiven,
    avgOrder: valid.length ? revenue / valid.length : 0,
    buckets: activeBuckets,
    cumulative,
    bestSellers, categoryRevenue,
    cash, card, parcel, dinein, vegQty, nonvegQty, voided,
  }
}

// ---- Reusable charts ------------------------------------------------------

function BarChart({ data, color = '#7c3aed', format = (v) => v }) {
  if (!data || data.length === 0) return <Empty />
  const max = Math.max(...data.map((d) => d.value), 1)
  const barW = 30
  const gap = 10
  const chartH = 140
  const width = data.length * (barW + gap) + gap
  return (
    <div className="overflow-x-auto">
      <svg width={width} height={chartH + 30} role="img" aria-label="bar chart">
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.value / max) * chartH))
          const x = gap + i * (barW + gap)
          const y = chartH - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx="4" fill={color} />
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">
                {typeof d.value === 'number' && !Number.isInteger(d.value) ? d.value.toFixed(0) : format(d.value)}
              </text>
              <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">
                {d.label}
              </text>
              {d.sub != null && (
                <text x={x + barW / 2} y={chartH + 28} textAnchor="middle" fontSize="9" fill="#cbd5e1">
                  {d.sub}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SplitBar({ segments, format = (v) => v }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return <Empty />
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-full">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
            <span className="font-semibold text-slate-700">{s.label}</span>
            <span className="text-slate-500">
              {format(s.value)} ({Math.round((s.value / total) * 100)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function BarList({ rows, format = (v) => v }) {
  if (!rows || rows.length === 0) return <Empty />
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-0.5 flex items-center gap-1.5 text-sm">
            {r.veg != null && <VegDot veg={r.veg} size={13} />}
            <span className="flex-1 font-semibold text-slate-700">{r.label}</span>
            {r.note && <span className="text-xs text-slate-400">{r.note}</span>}
            <span className="text-slate-500">{format(r.value)}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-violet-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Donut / pie chart from segments. Pure SVG, no library.
function Donut({ segments, size = 96 }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return <Empty />
  const r = size / 2
  const stroke = size * 0.22
  const radius = r - stroke / 2
  const circ = 2 * Math.PI * radius
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="donut chart">
      <g transform={`rotate(-90 ${r} ${r})`}>
        {segments.map((s) => {
          const frac = s.value / total
          const dash = frac * circ
          const el = (
            <circle
              key={s.label}
              cx={r}
              cy={r}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
            />
          )
          offset += dash
          return el
        })}
      </g>
    </svg>
  )
}

// Simple SVG line/area chart for a cumulative trend.
function LineChart({ data, format = (v) => v }) {
  if (!data || data.length === 0) return <Empty />
  const h = 150
  const padX = 8
  const padTop = 18
  const stepX = 46
  const width = Math.max(data.length * stepX, stepX) + padX * 2
  const max = Math.max(...data.map((d) => d.value), 1)
  const x = (i) => padX + i * stepX
  const y = (v) => padTop + (1 - v / max) * (h - padTop - 22)
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const area = `${padX},${h - 22} ${pts} ${x(data.length - 1)},${h - 22}`
  return (
    <div className="overflow-x-auto">
      <svg width={width} height={h} role="img" aria-label="revenue trend">
        <polygon points={area} fill="#0ea5e9" opacity="0.12" />
        <polyline points={pts} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r="3" fill="#0ea5e9" />
            {(i === data.length - 1 || i % 2 === 0) && (
              <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {d.label}
              </text>
            )}
          </g>
        ))}
        <text x={x(data.length - 1)} y={y(data[data.length - 1].value) - 6} textAnchor="end" fontSize="10" fontWeight="700" fill="#0369a1">
          {format(data[data.length - 1].value)}
        </text>
      </svg>
    </div>
  )
}

function LineRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-semibold ${strong || 'text-slate-700'}`}>{value}</span>
    </div>
  )
}

// ---- CSV ------------------------------------------------------------------

function exportCSV(dayOrders, date) {
  const header = [
    'order_number', 'items', 'discount_pct', 'subtotal', 'card_fee', 'total',
    'payment_method', 'status', 'order_type', 'time', 'created_at',
  ]
  const rows = dayOrders.map((o) => [
    o.order_number,
    o.items.map((i) => `${i.quantity}x ${i.name}`).join('; '),
    Number(o.discount_pct || 0),
    Number(o.subtotal ?? o.total).toFixed(2),
    Number(o.vat || 0).toFixed(2),
    Number(o.total).toFixed(2),
    o.payment_method || 'cash',
    o.status,
    o.order_type,
    clockTime(o.created_at),
    o.created_at,
  ])
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${date}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---- Small UI bits --------------------------------------------------------

function Section({ title, children }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="rounded-2xl bg-white p-4 border border-slate-200">{children}</div>
    </section>
  )
}

function Stat({ label, value, hint, accent }) {
  return (
    <div className="rounded-2xl bg-white p-4 border border-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-black ${accent || 'text-slate-900'}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function MiniCard({ title, rows }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="mb-1 font-bold text-slate-700">{title}</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between text-slate-500">
          <span>{k}</span>
          <span className="font-semibold text-slate-700">{v}</span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    active: 'bg-sky-100 text-sky-700',
    collected: 'bg-emerald-100 text-emerald-700',
    voided: 'bg-red-100 text-red-700',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${map[status] || ''}`}>{status}</span>
}

function Empty() {
  return <p className="py-4 text-center text-slate-400">No data for this day.</p>
}

// ---- Menu editor ----------------------------------------------------------

function MenuEditor() {
  const { menu, saveMenu } = useMenu()
  const [draft, setDraft] = useState(menu)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  // Pull in external menu changes only when we have no unsaved local edits.
  useEffect(() => {
    if (!dirty) setDraft(menu)
  }, [menu, dirty])

  const categories = [...new Set(draft.map((i) => i.category).filter(Boolean))]

  const touch = () => {
    setDirty(true)
    setSaved(false)
  }
  const update = (id, patch) => {
    touch()
    setDraft((d) => d.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  const remove = (id) => {
    touch()
    setDraft((d) => d.filter((it) => it.id !== id))
  }
  const add = () => {
    touch()
    setDraft((d) => [...d, blankItem()])
  }
  async function save() {
    const clean = draft
      .filter((i) => i.name.trim())
      .map((i) => ({
        ...i,
        name: i.name.trim(),
        price: Number(i.price) || 0,
        category: (i.category || '').trim() || 'Other',
        veg: !!i.veg,
      }))
    await saveMenu(clean)
    setDraft(clean)
    setDirty(false)
    setSaved(true)
  }
  function discard() {
    setDraft(menu)
    setDirty(false)
    setSaved(false)
  }

  return (
    <div className="px-4 py-4 pb-28">
      <p className="mb-3 text-sm text-slate-500">
        Edit names, prices, category and veg/non-veg. Tap the dot to flip veg ⇄ non-veg.
        Press <b>Save</b> to apply — changes sync to the cashier.
      </p>

      <ul className="space-y-3">
        {draft.map((it) => (
          <li key={it.id} className="rounded-2xl bg-white p-3 border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => update(it.id, { veg: !it.veg })}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold ${
                  it.veg ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}
                aria-label={`Toggle veg/non-veg for ${it.name || 'item'}`}
              >
                <VegDot veg={it.veg} size={18} />
                {it.veg ? 'Veg' : 'Non'}
              </button>
              <input
                value={it.name}
                onChange={(e) => update(it.id, { name: e.target.value })}
                placeholder="Item name"
                className="min-h-touch min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold"
              />
              <button
                onClick={() => remove(it.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
                aria-label={`Delete ${it.name || 'item'}`}
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-300 px-3">
                <span className="text-slate-400">€</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={it.price === 0 ? '' : it.price}
                  onChange={(e) => update(it.id, { price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="min-h-touch w-24 py-2 text-base font-bold"
                />
              </div>
              <input
                list="menu-categories"
                value={it.category}
                onChange={(e) => update(it.id, { category: e.target.value })}
                placeholder="Category"
                className="min-h-touch min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base"
              />
            </div>
          </li>
        ))}
      </ul>
      <datalist id="menu-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <button
        onClick={add}
        className="mt-3 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-base font-bold text-slate-500 active:bg-slate-50"
      >
        <Plus size={20} /> Add item
      </button>

      {/* Sticky save bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
            <Check size={16} /> Saved
          </span>
        )}
        <button
          onClick={discard}
          disabled={!dirty}
          className="ml-auto min-h-touch rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 disabled:opacity-40"
        >
          Discard
        </button>
        <button
          onClick={save}
          disabled={!dirty}
          className="min-h-touch rounded-xl bg-brand-600 px-6 py-3 font-bold text-white disabled:bg-slate-300"
        >
          Save changes
        </button>
      </div>
    </div>
  )
}

// ---- Break-even ------------------------------------------------------------

function BreakEven({ net, costs }) {
  const pct = costs > 0 ? Math.min(100, (net / costs) * 100) : net > 0 ? 100 : 0
  const remaining = costs - net
  const broke = remaining <= 0 && costs > 0
  return (
    <div className="mb-4 rounded-2xl bg-white p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Break-even (all days)</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            broke ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {broke ? 'Reached' : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-400">Net earned so far</p>
          <p className="text-3xl font-black text-slate-900">{euro(net)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Total costs</p>
          <p className="text-lg font-bold text-slate-600">{euro(costs)}</p>
        </div>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-3 rounded-full"
          style={{ width: `${pct}%`, background: broke ? '#16a34a' : '#f59e0b' }}
        />
      </div>
      <p className="mt-2 text-center text-sm font-bold">
        {broke ? (
          <span className="text-emerald-600">Broke even — profit {euro(-remaining)}</span>
        ) : (
          <span className="text-amber-700">{euro(Math.max(0, remaining))} more to break even</span>
        )}
      </p>
      {costs === 0 && (
        <p className="mt-1 text-center text-xs text-slate-400">Add your costs in the Costs tab.</p>
      )}
    </div>
  )
}

// ---- Expenses editor ------------------------------------------------------

function ExpensesEditor() {
  const { expenses, saveExpenses } = useExpenses()
  const [draft, setDraft] = useState(expenses)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!dirty) setDraft(expenses)
  }, [expenses, dirty])

  const total = draft.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const touch = () => {
    setDirty(true)
    setSaved(false)
  }
  const update = (id, patch) => {
    touch()
    setDraft((d) => d.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  const remove = (id) => {
    touch()
    setDraft((d) => d.filter((e) => e.id !== id))
  }
  const add = () => {
    touch()
    setDraft((d) => [...d, blankExpense()])
  }
  async function save() {
    const clean = draft
      .filter((e) => e.label.trim() || e.amount)
      .map((e) => ({ ...e, label: e.label.trim() || 'Untitled', amount: Number(e.amount) || 0 }))
    await saveExpenses(clean)
    setDraft(clean)
    setDirty(false)
    setSaved(true)
  }
  function discard() {
    setDraft(expenses)
    setDirty(false)
    setSaved(false)
  }

  return (
    <div className="px-4 py-4 pb-28">
      <p className="mb-3 text-sm text-slate-500">
        Your costs — used for the break-even tracker on the Reports tab.
      </p>

      <div className="mb-3 flex items-center justify-between rounded-2xl bg-white p-4 border border-slate-200">
        <span className="text-lg font-bold text-slate-600">Total costs</span>
        <span className="text-2xl font-black text-slate-900">{euro(total)}</span>
      </div>

      <ul className="space-y-2">
        {draft.map((e) => (
          <li key={e.id} className="flex items-center gap-2 rounded-xl bg-white p-2 border border-slate-200">
            <input
              value={e.label}
              onChange={(ev) => update(e.id, { label: ev.target.value })}
              placeholder="What for"
              className="min-h-touch min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold"
            />
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 px-2">
              <span className="text-slate-400">€</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={e.amount === 0 ? '' : e.amount}
                onChange={(ev) => update(e.id, { amount: parseFloat(ev.target.value) || 0 })}
                placeholder="0.00"
                className="min-h-touch w-24 py-2 text-base font-bold"
              />
            </div>
            <button
              onClick={() => remove(e.id)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
              aria-label={`Delete ${e.label || 'cost'}`}
            >
              <Trash2 size={20} />
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={add}
        className="mt-3 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-base font-bold text-slate-500 active:bg-slate-50"
      >
        <Plus size={20} /> Add cost
      </button>

      <div
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
            <Check size={16} /> Saved
          </span>
        )}
        <button
          onClick={discard}
          disabled={!dirty}
          className="ml-auto min-h-touch rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 disabled:opacity-40"
        >
          Discard
        </button>
        <button
          onClick={save}
          disabled={!dirty}
          className="min-h-touch rounded-xl bg-brand-600 px-6 py-3 font-bold text-white disabled:bg-slate-300"
        >
          Save changes
        </button>
      </div>
    </div>
  )
}
