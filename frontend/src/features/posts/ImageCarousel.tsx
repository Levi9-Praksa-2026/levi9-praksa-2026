import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { PostImage } from '@/shared/api/contracts/posts'
import { useReducedMotion } from '@/shared/hooks/useMediaQuery'
import { cn } from '@/shared/lib/cn'
import { slideIndex } from './slideIndex'
import { ImageViewer } from './ImageViewer'

export interface ImageCarouselProps {
  images: readonly PostImage[]
  /** card: a fixed height in the feed. page: taller. */
  variant: 'card' | 'page'
}

/**
 * Two or three images one at a time: swipe or scroll sideways (it snaps to each image), the arrows on wider
 * screens, the dots under it, or the arrow keys once it has focus. The dots show which image is on screen.
 */
export function ImageCarousel({ images, variant }: ImageCarouselProps) {
  const strip = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [openImage, setOpenImage] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  const count = images.length

  function show(index: number) {
    const el = strip.current
    if (!el) return
    const target = Math.min(count - 1, Math.max(0, index))
    el.scrollTo({ left: target * el.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  // The scroll position is the truth: a swipe, a trackpad, the arrows and the dots all land here.
  function onScroll() {
    const el = strip.current
    if (el) setCurrent(slideIndex(el.scrollLeft, el.clientWidth, count))
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1) }
  }

  const height = variant === 'card' ? 'h-[360px]' : 'h-[min(70vh,560px)]'
  const arrow = 'absolute top-1/2 hidden size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-bg/90 text-ink shadow-sm hover:bg-bg sm:grid'

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Post images" className="grid gap-2">
      <div className="relative">
        {/* A focusable scroll strip that takes the arrow keys: how a carousel is used without a mouse. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={strip}
          role="group"
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          // Focusable so the arrow keys work.
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label={`Image ${current + 1} of ${count}. Use the arrow keys to move.`}
          className={cn(
            'flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-md border border-line bg-surface',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-action',
            height,
          )}
        >
          {images.map((image, index) => {
            const picture = (
              <img
                src={image.url}
                alt={`Attachment ${index + 1} of ${count}`}
                loading={index === 0 ? undefined : 'lazy'}
                decoding="async"
                draggable={false}
                className="size-full object-contain"
              />
            )
            return (
              <div
                key={image.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                aria-hidden={index !== current}
                className="h-full w-full flex-none snap-center"
              >
                <button type="button" aria-label={`Enlarge image ${index + 1}`} onClick={() => setOpenImage(image.url)} tabIndex={index === current ? 0 : -1} className="block size-full cursor-zoom-in">
                  {picture}
                </button>
              </div>
            )
          })}
        </div>

        <span aria-hidden="true" className="absolute top-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-label font-medium text-white">
          {current + 1} / {count}
        </span>
        {current > 0 && (
          <button type="button" onClick={() => show(current - 1)} aria-label="Previous image" className={cn(arrow, 'left-2')}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        {current < count - 1 && (
          <button type="button" onClick={() => show(current + 1)} aria-label="Next image" className={cn(arrow, 'right-2')}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {openImage && <ImageViewer url={openImage} onClose={() => setOpenImage(null)} />}
      <div className="flex justify-center gap-1.5">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => show(index)}
            aria-label={`Show image ${index + 1} of ${count}`}
            aria-current={index === current ? 'true' : undefined}
            className="grid size-6 cursor-pointer place-items-center rounded-full"
          >
            <span className={cn('size-2 rounded-full transition-colors', index === current ? 'bg-accent' : 'bg-line-strong')} />
          </button>
        ))}
      </div>
    </div>
  )
}
