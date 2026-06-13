import { useEffect, useRef } from 'react'

// Accessible confirmation modal.
// - role="dialog" + aria-modal, labelled by the title
// - Escape cancels, clicking the backdrop cancels
// - Confirm button is auto-focused
// - Body scroll is locked while open
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirmRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        <h2 id="confirm-title" className="text-xl font-bold text-slate-900">
          {title}
        </h2>
        {message && <p className="mt-2 text-slate-600">{message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="min-h-touch rounded-xl bg-slate-100 py-3 text-base font-bold text-slate-700 active:bg-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`min-h-touch rounded-xl py-3 text-base font-bold text-white ${
              danger ? 'bg-red-600 active:bg-red-700' : 'bg-blue-600 active:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
