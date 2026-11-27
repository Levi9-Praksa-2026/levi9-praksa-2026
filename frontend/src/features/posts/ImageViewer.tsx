import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function ImageViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.documentElement.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  return createPortal(
    // Escape and the close button provide keyboard dismissal; this handler dismisses the backdrop.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog ref={ref} aria-label="Enlarged image" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-ink/90 p-4 backdrop:bg-transparent open:flex">
      <button type="button" aria-label="Close image" onClick={onClose} className="absolute top-4 right-4 cursor-pointer rounded-full bg-ink/70 p-2 text-white hover:bg-ink">
        <X className="size-6" aria-hidden="true" />
      </button>
      <img src={url} alt="Enlarged attachment" className="max-h-full max-w-full object-contain" />
    </dialog>,
    document.body,
  )
}
