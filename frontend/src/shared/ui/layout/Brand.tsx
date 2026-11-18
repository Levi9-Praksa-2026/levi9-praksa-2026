import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/env'
import { AppLink } from '@/shared/ui/Link'
import type { MarkShape } from '@/shared/ui/types'

export interface BrandProps {
  name: string
  href: string
  /** The chosen mark, or the client's own logo (an `<img>` or inline SVG) in its place. */
  mark: MarkShape | ReactNode
  className?: string
}

const SHAPES: readonly MarkShape[] = ['wordmark', 'initial', 'dots', 'arc', 'ring', 'petal', 'leaf', 'stack']
const isShape = (m: unknown): m is MarkShape => typeof m === 'string' && (SHAPES as readonly string[]).includes(m)

/** The name with its mark (`.nav__logo`), in the nav and again in the footer. */
export function Brand({ name, href, mark, className }: BrandProps) {
  let glyph: ReactNode = null
  if (!isShape(mark)) glyph = mark
  else if (mark === 'initial') glyph = <span className="mark mark--initial" aria-hidden="true">{name.trim().charAt(0)}</span>
  else if (mark !== 'wordmark') glyph = <span className="mark" data-mark={mark} aria-hidden="true" />
  return (
    <AppLink className={cx('nav__logo', className)} href={href}>
      {glyph}
      {name}
    </AppLink>
  )
}
