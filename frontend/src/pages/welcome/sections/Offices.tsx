import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Section, SectionHead } from '@/shared/ui/Section'
import { PhotoImg } from '@/shared/ui/Media'
import { useInView } from '@/shared/hooks/useInView'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import type { Office } from '@/pages/welcome/content'
import '@/pages/welcome/sections/offices.css'

export interface OfficesProps {
  offices: readonly Office[]
  title: string
  lead: string
}

/** Milliseconds each office stays up before the album turns on its own. */
const TURN_MS = 3000

/** Where a slide sits relative to the current one, wrapped round: 0 centre, -1 left, 1 right, 2 behind. */
function offsetOf(i: number, index: number, count: number): number {
  let d = (i - index + count) % count
  if (d > count / 2) d -= count
  return d
}

/**
 * The offices as a photo album: the current office large in the centre, its neighbours peeking at the
 * sides, the two arrows together at the foot of the centre photo. It turns on its own every few seconds
 * while on screen; hover or focus holds it, an arrow or a name restarts the clock, reduced motion keeps it by hand.
 */
export function Offices({ offices, title, lead }: OfficesProps) {
  const count = offices.length
  const rootRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [held, setHeld] = useState(false)
  const [turn, setTurn] = useState(0) // bumps on every manual move, restarting the clock
  const inView = useInView(rootRef)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const running = count > 1 && inView && !held && !reduced

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setIndex(i => (i + 1) % count), TURN_MS)
    return () => clearTimeout(timer)
  }, [running, index, count, turn])

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count)
      setTurn(t => t + 1)
    },
    [count],
  )

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') go(index + 1)
    else if (e.key === 'ArrowLeft') go(index - 1)
    else return
    e.preventDefault()
  }

  const current = offices[index]

  return (
    <Section id="offices" screens={1}>
      <SectionHead title={title} lead={lead} className="lv-album__head" />
      <div
        ref={rootRef}
        className="lv-album"
        role="region"
        aria-roledescription="carousel"
        aria-label="Levi9 offices"
        onKeyDown={onKey}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
      >
        <div className="lv-album__stage">
          {offices.map((o, i) => {
            const d = offsetOf(i, index, count)
            const pos = d === 0 ? 'centre' : d === -1 ? 'left' : d === 1 ? 'right' : 'back'
            return (
              <div
                key={o.id}
                className="lv-album__slide"
                data-pos={pos}
                aria-hidden={d !== 0}
                onClick={d === -1 || d === 1 ? () => go(i) : undefined}
              >
                <PhotoImg photo={o.photo} />
                <span className="lv-album__name">{o.label}</span>
              </div>
            )
          })}
          <div className="lv-album__arrows">
            <button type="button" className="lv-album__arrow" aria-label="Previous office" onClick={() => go(index - 1)}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M12.5 4.5 7 10l5.5 5.5" />
              </svg>
            </button>
            <button type="button" className="lv-album__arrow" aria-label="Next office" onClick={() => go(index + 1)}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M7.5 4.5 13 10l-5.5 5.5" />
              </svg>
            </button>
          </div>
        </div>
        <div className="lv-album__tabs" role="group" aria-label="Pick an office">
          {offices.map((o, i) => (
            <button key={o.id} type="button" className="lv-album__tab" aria-pressed={i === index} onClick={() => go(i)}>
              {o.label}
              <span className="lv-album__run" aria-hidden="true">
                {i === index && running && <span key={`${index}-${turn}`} className="lv-album__bar" />}
              </span>
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {current?.label}, office {index + 1} of {count}
        </p>
      </div>
    </Section>
  )
}
