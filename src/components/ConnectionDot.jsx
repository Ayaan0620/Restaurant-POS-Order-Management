// Small always-visible sync-status indicator.
//   green  = online / synced (or local-only mode, which is durable on-device)
//   amber  = connecting
//   red    = offline, orders are queued locally
// Shows the count of unsynced orders so nothing is ever silently stuck.
export default function ConnectionDot({ connection, unsyncedCount = 0 }) {
  const map = {
    online: { color: '#16a34a', label: 'Synced' },
    local: { color: '#16a34a', label: 'On device' },
    connecting: { color: '#f59e0b', label: 'Connecting' },
    offline: { color: '#dc2626', label: 'Offline' },
  }
  const s = map[connection] || map.connecting

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium shadow ring-1 ring-black/5">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ background: s.color }}
      />
      <span className="text-slate-700">{s.label}</span>
      {unsyncedCount > 0 && (
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
          {unsyncedCount} queued
        </span>
      )}
    </div>
  )
}
