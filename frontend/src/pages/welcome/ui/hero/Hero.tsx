import { useId, useRef, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { HeroContext } from '@/pages/welcome/ui/hero/hero-context'
import { phaseClass, useHeroEnter } from '@/pages/welcome/ui/hero/useHeroEnter'

export interface HeroProps {
  /** The one entrance on load; `false` only for a hero that must stand. */
  enter?: boolean
  children: ReactNode
}

/**
 * The hero section: at least the first screen, growing with its content, labelled by its h1 (`<HeroTitle>` takes the id). Runs
 * the entrance and gives its phase to the title. The welcome page's split hero builds on it
 * (`sections/Hero.tsx`).
 */
export function Hero({ enter = true, children }: HeroProps) {
  const ref = useRef<HTMLElement>(null)
  const titleId = useId()
  const phase = useHeroEnter(ref, enter)
  return (
    <HeroContext.Provider value={{ phase, titleId }}>
      <section
        ref={ref}
        className={cn(
          'hero relative isolate min-h-svh pt-[calc(var(--nav)+var(--photo,0px)+var(--hgap))] pb-[calc(var(--hpadb)+var(--bar))]',
          phaseClass[phase],
        )}
        data-enter={enter ? '' : 'off'}
        aria-labelledby={titleId}
      >
        {children}
      </section>
    </HeroContext.Provider>
  )
}
