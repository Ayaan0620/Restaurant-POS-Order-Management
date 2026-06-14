import { WifiOff } from 'lucide-react'

// Bold, hard-to-miss banner shown when this device has lost its connection to
// Supabase. While offline, orders still save locally but don't sync to/from
// other devices — staff need to know that immediately.
export default function OfflineBanner({ connection }) {
  if (connection !== 'offline') return null
  return (
    <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-bold text-white">
      <WifiOff size={18} />
      Offline — orders aren’t syncing between devices right now
    </div>
  )
}
