import { useEffect, type ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Wider sheet for the import review table. */
  wide?: boolean
}

export function Modal({ open, title, onClose, children, wide = false }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        // Bottom sheet on phones, centred dialog on desktop.
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border
          border-white/10 bg-[#141a21] shadow-2xl sm:rounded-2xl
          ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xl leading-none text-white/50 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
