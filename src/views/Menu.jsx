import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import PinGate, { lockView } from '../components/PinGate.jsx'
import MenuEditor from '../components/MenuEditor.jsx'

export default function Menu() {
  return (
    <PinGate viewKey="menu" title="Menu" accent="#ea580c">
      <div className="min-h-screen bg-slate-100 pb-10">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link to="/" className="text-sm font-medium text-slate-500">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Menu</h1>
          <button onClick={() => lockView('menu')} className="p-1 text-slate-500" title="Lock view">
            <Lock size={20} />
          </button>
        </header>
        <MenuEditor />
      </div>
    </PinGate>
  )
}
