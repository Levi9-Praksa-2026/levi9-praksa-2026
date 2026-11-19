'use client'
import { useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { HeroContext } from '@/shared/lib/hero-context'
import { phaseClass, useHeroEnter } from '@/shared/hooks/useHeroEnter'

/** The chosen hero ids this layer builds (assets/layout/hero-<id>.html). */
export type HeroVariant = 'centred' | 'split' | 'statement' | 'word' | 'product' | 'photo'

export interface HeroProps {
  variant: HeroVariant
  /** The one entrance on load; `false` only for a hero that must stand (a second page's hero). */
  enter?: boolean
  /** Extra classes on the section: a CSS ground (`bg-horizon`) or a calm side. */
  className?: string
  style?: CSSProperties
  /** Attributes the variant's CSS reads (`data-calm`, `data-box`). */
  data?: Record<`data-${string}`, string>
  children: ReactNode
}

/**
 * The hero section: `section.hero.hero--<variant>[data-enter]`, exactly the first screen, labelled by
 * its h1 (`<HeroTitle>` takes the id). Runs the entrance and gives its phase to the title. The
 * variant components (`HeroCentred`, `HeroSplit`, ...) build on it; use it alone only for a recipe
 * they do not cover, keeping the shape `section.hero > .wrap > .hero-text`.
 */
export function Hero({ variant, enter = true, className, style, data, children }: HeroProps) {
  const ref = useRef<HTMLElement>(null)
  const titleId = useId()
  const phase = useHeroEnter(ref, enter)
  return (
    <HeroContext.Provider value={{ phase, titleId }}>
      <section
        ref={ref}
        className={cn(
          'hero relative isolate h-svh min-h-0 pt-[calc(var(--nav)+var(--photo,0px)+var(--hgap))] pb-[calc(var(--hpadb)+var(--bar))]',
          'max-sm:grid max-sm:h-auto max-sm:min-h-svh max-sm:grid-cols-[minmax(0,1fr)] max-sm:grid-rows-[1fr] max-sm:auto-rows-auto',
          `hero--${variant}`,
          phaseClass[phase],
          className,
        )}
        data-enter={enter ? '' : 'off'}
        aria-labelledby={titleId}
        style={style}
        {...data}
      >
        {children}
      </section>
    </HeroContext.Provider>
  )
}
