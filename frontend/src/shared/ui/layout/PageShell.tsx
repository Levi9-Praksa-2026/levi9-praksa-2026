'use client'
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { ButtonLook, LitGround, PageType, Radius, SiteKind, Sizing } from '@/shared/ui/types'
import { PageContext, type PageContextValue } from '@/shared/lib/page-context'
import { useIsoLayoutEffect } from '@/shared/hooks/useIsoLayoutEffect'

export interface PageShellProps {
  /** `<html data-type>` and `<meta name="page-type">`. */
  type: PageType
  /** `<meta name="site-kind">`. */
  kind: SiteKind
  /** The chosen radius; `sharp` for fintech and developer tools, `round` for consumer apps. */
  radius?: Radius
  /** The chosen button look. */
  buttons?: ButtonLook
  /** The lit ground (tech pages only). */
  ground?: LitGround
  /** `false` switches the motion layer off (`<html data-motion="off">`); `'live'` writes
      `data-motion="live"`, which the design system's own plain-JS motion reads; the React layer moves the same either way. */
  motion?: boolean | 'live'
  /** `screens` (default): every section one or two screens tall. `flow`: sections as tall as their content. */
  sizing?: Sizing
  lang?: string
  title: string
  description: string
  children: ReactNode
}

type Attrs = Record<string, string | null>

/** Sets attributes on an element for as long as the caller is mounted, then puts the old ones back. */
function useElementAttributes(get: () => Element, attrs: Attrs): void {
  const key = JSON.stringify(attrs)
  useIsoLayoutEffect(() => {
    const el = get()
    const before: Attrs = {}
    for (const [name, value] of Object.entries(attrs)) {
      before[name] = el.getAttribute(name)
      if (value === null) el.removeAttribute(name)
      else el.setAttribute(name, value)
    }
    return () => {
      for (const [name, value] of Object.entries(before)) {
        if (value === null) el.removeAttribute(name)
        else el.setAttribute(name, value)
      }
    }
    // attrs is compared by value through key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** A `<meta name>` in the head for as long as the page is mounted. */
function useMeta(name: string, content: string | null): void {
  useIsoLayoutEffect(() => {
    if (content === null) return
    let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    const made = !meta
    const before = meta?.content ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = name
      document.head.append(meta)
    }
    meta.content = content
    return () => {
      if (made) meta.remove()
      else if (before !== null) meta.content = before
    }
  }, [name, content])
}

/**
 * The root of every page. It declares the page to the design system's CSS
 * (`<html data-type data-radius data-buttons data-ground data-motion>`, the page-type and site-kind
 * metas, the title), arms the hero's entrance before the first paint, and runs the page-level checks
 * (tone, pictures, placeholders). Children read the kind and the ready gate through `usePage()`.
 *
 * Put it at the top of the page's own entry (or route), around the nav, main and footer.
 */
export function PageShell({
  type, kind, radius = 'soft', buttons = 'solid', ground, motion = true, sizing = 'screens', lang = 'en', title, description, children,
}: PageShellProps) {
  useElementAttributes(() => document.documentElement, {
    lang,
    'data-type': type,
    'data-radius': radius,
    'data-buttons': buttons,
    'data-ground': ground ?? null,
    'data-sizing': sizing === 'flow' ? 'flow' : null,
    'data-motion': motion === 'live' ? 'live' : motion ? '' : 'off',
  })
  useMeta('description', description)
  useIsoLayoutEffect(() => {
    const before = document.title
    document.title = title
    return () => {
      document.title = before
    }
  }, [title])

  // The hero's entrance (motion.css): the words wait under html.m-enter from the first paint, and a
  // 700ms safety mark lets CSS show them if the entrance never starts. A layout effect runs before
  // the browser paints, so it does what the static page's head line does.
  useIsoLayoutEffect(() => {
    const root = document.documentElement
    if (!motion) {
      root.classList.add('m-enter-done')
      return () => root.classList.remove('m-enter-done')
    }
    root.classList.add('m-enter')
    const mark = window.setTimeout(() => root.classList.add('m-enter-done'), 700)
    return () => {
      clearTimeout(mark)
      root.classList.remove('m-enter', 'm-enter-done')
    }
  }, [motion])

  // The ready gate: <html data-ready="1"> once every piece of work a child holds has settled.
  const pending = useRef(0)
  const mounted = useRef(false)
  const settle = useCallback(() => {
    if (mounted.current && pending.current === 0) document.documentElement.dataset.ready = '1'
  }, [])
  const holdReady = useCallback(
    (work: Promise<unknown>) => {
      pending.current++
      delete document.documentElement.dataset.ready
      work.catch(error => console.warn('', error)).finally(() => {
        pending.current--
        settle()
      })
    },
    [settle],
  )

  // Children's effects run before this one, so all the work of the first commit is already held.
  useEffect(() => {
    mounted.current = true
    settle()
    return () => {
      mounted.current = false
      delete document.documentElement.dataset.ready
    }
  }, [settle])

  const value = useMemo<PageContextValue>(
    () => ({ type, kind, sizing, still: kind === 'other' || type === 'place', motion, holdReady }),
    [type, kind, sizing, motion, holdReady],
  )
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>
}
