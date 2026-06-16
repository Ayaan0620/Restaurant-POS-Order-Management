import { useEffect, useState } from 'react'
import { Trash2, Plus, Check } from 'lucide-react'
import { useMenu } from '../lib/useMenu.js'
import { blankItem } from '../lib/menuStore.js'
import { parseDecimal, decimalInputValue } from '../lib/format.js'
import VegDot from './VegDot.jsx'

// Edit the live menu (names, prices, category, veg/non-veg). Saves sync to all
// devices. Used by both the Admin → Menu tab and the standalone /menu screen.
export default function MenuEditor() {
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
        price: parseDecimal(i.price),
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
          <li key={it.id} className="rounded-2xl border border-slate-200 bg-white p-3">
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
                  type="text"
                  inputMode="decimal"
                  value={decimalInputValue(it.price)}
                  onChange={(e) => update(it.id, { price: e.target.value })}
                  placeholder="0,00"
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
