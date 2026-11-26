import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/** Native dialog supplies modal focus containment and makes the page behind it inert. */
export function Modal({ title, children, onClose, busy = false, size = 'sm' }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; size?: 'sm' | 'lg' }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => { dialog.close(); previous?.focus() }
  }, [])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose() }} className={cn('fixed inset-0 m-auto max-h-[90svh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-lg border border-line bg-bg p-card-pad text-ink backdrop:bg-[rgb(20_24_51/0.4)]', size === 'lg' ? 'max-w-feed' : 'max-w-form')}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-h3">{title}</h2>
        <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="grid size-8 flex-none cursor-pointer place-items-center rounded-btn hover:bg-surface disabled:opacity-50"><X className="size-5" aria-hidden="true" /></button>
      </header>
      {children}
    </dialog>
  )
}
