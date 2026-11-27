import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function ImageViewer({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Enlarged image" className="fixed inset-0 z-50 flex items-center justify-center bg-[#000]/90 p-4" onClick={(event) => { event.stopPropagation(); onClose() }}>
      <button type="button" aria-label="Close image" className="absolute top-4 right-4 cursor-pointer rounded-full bg-[#000]/50 p-2 text-white hover:bg-[#000]/80">
        <X className="size-6" aria-hidden="true" />
      </button>
      <img src={url} alt="Enlarged attachment" className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
    </div>,
    document.body,
  )
}
