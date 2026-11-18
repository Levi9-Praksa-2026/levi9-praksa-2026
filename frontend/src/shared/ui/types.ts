import type { MouseEvent } from 'react'

/* The design system's vocabulary as types. Every value here is a class, attribute or chosen id the design system's CSS and
   the CSS already knows; widening a union means the CSS has to learn the new value first. */

/** `<html data-type>` and `<meta name="page-type">`: decides the hero list and the place rules. */
export type PageType = 'software' | 'product' | 'service' | 'place'

/** `<meta name="site-kind">`: tech kinds may move (effects, loops, counts); `other` only enters and hovers. */
export type SiteKind = 'software' | 'gaming' | 'tech' | 'other'

export type Radius = 'sharp' | 'soft' | 'round'

/** `<html data-buttons>`: the chosen button look; the button markup never changes with it. */
export type ButtonLook = 'solid' | 'pill' | 'tonal' | 'arrow' | 'block'

/** `<html data-ground>`: the lit ground behind panels, frames and the closing band (tech only). */
export type LitGround = 'sand' | 'sky' | 'sage' | 'painting'

/** A section's ground band: `.ground-surface`, `.ground-inverse` and `.ground-brand` (the rhythm
    brand-band: the brand's own colour, one section in the page's second half) flip the colour roles inside. */
export type Ground = 'base' | 'surface' | 'inverse' | 'brand'

/** How many 1440x900 screens a section is tall (`--h`). */
export type Screens = 1 | 2

/** How a page's sections are sized: `screens` (each one or two screens tall, the default) or `flow`. `<html data-sizing>`. */
export type Sizing = 'screens' | 'flow'

/** The chosen brand mark beside the name. `wordmark` is the name alone. */
export type MarkShape = 'wordmark' | 'initial' | 'dots' | 'arc' | 'ring' | 'petal' | 'leaf' | 'stack'

export interface LinkItem {
  label: string
  href: string
}

/** A link a click can also handle in the app (a router push, a sign-in call). */
export interface ActionItem extends LinkItem {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}
