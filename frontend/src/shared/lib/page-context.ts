'use client'
import { createContext, useContext } from 'react'
import type { PageType, SiteKind, Sizing } from '@/shared/ui/types'

export interface PageContextValue {
  type: PageType
  kind: SiteKind
  /** The page's sizing: `screens` (sections one or two screens tall) or `flow` (as tall as their content). */
  sizing: Sizing
  /** Kind other or a place: nothing moves by itself (no loops, counts or moving grounds). */
  still: boolean
  /** The motion layer: on, off (the hero stands, nothing moves) or live (moves in a headless check too). */
  motion: boolean | 'live'
  /** Holds `<html data-ready>` until `work` settles: a WebGL ground
      drawn, a moment mounted. Call it in the effect that starts the work. */
  holdReady: (work: Promise<unknown>) => void
}

const outside: PageContextValue = { type: 'software', kind: 'software', sizing: 'screens', still: false, motion: true, holdReady: () => {} }

export const PageContext = createContext<PageContextValue>(outside)

/** The page's kind and the ready gate. Outside a `<PageShell>` it answers as a software page. */
export function usePage(): PageContextValue {
  return useContext(PageContext)
}
