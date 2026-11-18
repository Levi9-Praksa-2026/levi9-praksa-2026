'use client'
import type { CSSProperties, ReactNode } from 'react'
import { usePage } from '@/shared/lib/page-context'
import { cx } from '@/shared/lib/env'
import { cssVars } from '@/shared/lib/style'
import type { Ground, Screens } from '@/shared/ui/types'

export interface SectionProps {
  /** The anchor the nav and buttons point at. */
  id: string
  /** How many 1440x900 screens it is tall: from its content, never padding. Required on a `screens` page; on a `flow` page leave it out (it is ignored). */
  screens?: Screens
  /** A ground band: `surface` or `inverse` flips the colour roles inside (one contrasting ground). */
  ground?: Ground
  /** Lay the wrap out as the design system's 12-column grid (`.wrap.grid`); off, the wrap is a column. */
  grid?: boolean
  /** Extra classes on the section: a CSS ground, a recipe class. */
  className?: string
  /** The wrap's own classes beside `.wrap` (a recipe's layout). */
  wrapClassName?: string
  style?: CSSProperties
  /** Attributes the design system reads on the section (`data-moment`, `data-fx`). */
  data?: Record<`data-${string}`, string>
  /** The heading row first (`<SectionHead>`), then the content. */
  children: ReactNode
}

const groundClass: Record<Ground, string | undefined> = {
  base: undefined,
  surface: 'ground-surface',
  inverse: 'ground-inverse',
  brand: 'ground-brand',
}

/**
 * One screen of the page: `main > section` with one `.wrap`, its h2 first, `--h` screens tall
 * The design system's CSS sets its height, padding and edges; the content inside uses the
 * design system's classes and Tailwind for what is particular to this section.
 */
export function Section({ id, screens, ground = 'base', grid = false, className, wrapClassName, style, data, children }: SectionProps) {
  const { sizing } = usePage()
  return (
    <section id={id} className={cx(groundClass[ground], className)} style={cssVars({ '--h': sizing === 'flow' ? undefined : screens }, style)} {...data}>
      <div className={cx('wrap', grid && 'grid ui-grid', wrapClassName)}>{children}</div>
    </section>
  )
}

export interface SectionHeadProps {
  /** The h2: a noun in it, saying what this screen shows. */
  title: ReactNode
  /** One plain line under it. */
  lead?: ReactNode
  /** Something on the right of the head row (a link, a button); makes it a split head. */
  aside?: ReactNode
  /** The h2's id, when something else is labelled by it. */
  id?: string
  className?: string
}

/** A section's heading row (`.section-head`); with an aside, the split head row (`.section-head--split`). */
export function SectionHead({ title, lead, aside, id, className }: SectionHeadProps) {
  const words = (
    <>
      <h2 id={id}>{title}</h2>
      {lead && <p>{lead}</p>}
    </>
  )
  if (!aside) return <div className={cx('section-head', className)}>{words}</div>
  return (
    <div className={cx('section-head section-head--split', className)}>
      <div>{words}</div>
      {aside}
    </div>
  )
}
