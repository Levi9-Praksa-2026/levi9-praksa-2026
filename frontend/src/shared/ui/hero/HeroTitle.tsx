'use client'
import { Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import { cx, fontsReady } from '@/shared/lib/env'
import { useFinePointer, useReducedMotion } from '@/shared/hooks/useMediaQuery'
import { useHero } from '@/shared/lib/hero-context'
import { LiveWord, type LiveWordProps } from '@/shared/ui/hero/LiveWord'

const markStroke = "before:absolute before:top-[27%] before:h-[42%] before:w-[13%] before:-skew-x-12 before:rounded-[99px] before:bg-bg before:content-[''] after:absolute after:top-[27%] after:h-[42%] after:w-[13%] after:-skew-x-12 after:rounded-[99px] after:bg-bg after:content-['']"

/** A round mark set before the h1's words. */
export function TitleMark() {
  return <span className={`relative mx-[.06em] inline-block size-[.8em] rounded-full bg-ink align-[-0.06em] before:left-[31%] after:left-[56%] ${markStroke}`} aria-hidden="true" />
}

type Token =
  | { kind: 'word'; text: string }
  | { kind: 'space' }
  | { kind: 'node'; node: ReactElement }

/** The children with every fragment opened (`<>...</>` is how a title with a mark is written). */
function flat(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap(child =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? flat(child.props.children) : [child],
  )
}

function tokenize(children: ReactNode): Token[] {
  const out: Token[] = []
  flat(children).forEach(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      String(child).split(/(\s+)/).forEach(part => {
        if (!part) return
        out.push(/^\s+$/.test(part) ? { kind: 'space' } : { kind: 'word', text: part })
      })
    } else if (isValidElement(child)) out.push({ kind: 'node', node: child })
  })
  return out
}

/** The h1 as one line of text, for its aria-label: a live word reads as its first word. */
function textOf(node: ReactNode): string {
  return flat(node)
    .map(child => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (!isValidElement(child)) return ''
      if (child.type === LiveWord) return (child.props as LiveWordProps).words[0]
      if (child.type === TitleMark) return ''
      return textOf((child.props as { children?: ReactNode }).children)
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

type Lock = { state: 'measuring' } | { state: 'locked'; breaks: ReadonlySet<number> } | { state: 'free' }

export interface HeroTitleProps {
  /** The headline: text, with at most one `<LiveWord>` and a `<TitleMark>` before it. It names the
      category and the buyer or the place. */
  children: ReactNode
  /** Letters near the pointer take a heavier weight (`wght`), or also a wider width on a face with a
      width axis (`wdth`); the word and editorial heroes only. */
  letters?: 'wght' | 'wdth'
  className?: string
}

/**
 * The hero's h1. During the entrance its words sit in masks and rise line by line; after it, it is
 * plain text again. A headline with a live word or letters is set as units with its lines locked
 * (a break where each line ends at rest, no wrapping), so a changing word or a heavier letter never
 * re-breaks a line; the lock is read again when the h1 changes width.
 */
export function HeroTitle({ children, letters, className }: HeroTitleProps) {
  const { phase, titleId } = useHero()
  const ref = useRef<HTMLHeadingElement>(null)
  const tokens = useMemo(() => tokenize(children), [children])
  // each non-space token's place among the h1's units (the elements the line lock measures)
  const unitOf = useMemo(
    () => tokens.map((t, i) => (t.kind === 'space' ? -1 : tokens.slice(0, i).filter(p => p.kind !== 'space').length)),
    [tokens],
  )
  const label = useMemo(() => textOf(children), [children])
  const hasLive = tokens.some(t => t.kind === 'node' && t.node.type === LiveWord)
  const hasMark = tokens.some(t => t.kind === 'node' && t.node.type === TitleMark)
  const units = !!letters || hasLive
  // a headline another part reworks (a live word, letters, a mark) rises whole
  const masks = phase === 'entering' && !units && !hasMark
  const [lock, setLock] = useState<Lock>({ state: 'measuring' })

  // lock the lines at rest: after the fonts, then again whenever the h1 changes width
  useEffect(() => {
    const h1 = ref.current
    if (!units || !h1) return
    let raf = 0, timer = 0, width = h1.clientWidth, alive = true
    const measure = () => {
      raf = requestAnimationFrame(() => {
        if (!alive) return
        const fs = parseFloat(getComputedStyle(h1).fontSize) || 16
        const breaks = new Set<number>()
        let top: number | null = null
        ;[...h1.children].filter(el => el.tagName !== 'BR').forEach((el, i) => {
          const t = el.getBoundingClientRect().top
          if (top !== null && t - top > fs * 0.5) breaks.add(i)
          top = t
        })
        setLock({ state: 'locked', breaks })
      })
    }
    fontsReady(3000).then(measure)
    const ro = new ResizeObserver(() => {
      if (h1.clientWidth === width) return
      width = h1.clientWidth
      clearTimeout(timer)
      setLock({ state: 'measuring' })
      timer = window.setTimeout(() => fontsReady(3000).then(measure), 150)
    })
    ro.observe(h1)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [units])

  // a lock that does not fit (read before the web font or the phone width arrived) is let go
  useEffect(() => {
    const h1 = ref.current
    if (lock.state === 'locked' && h1 && h1.scrollWidth > h1.clientWidth + 1) setLock({ state: 'free' })
  }, [lock])

  useLetters(ref, letters)

  let content: ReactNode = children
  if (masks) {
    content = tokens.map((t, i) =>
      t.kind === 'space' ? ' ' : (
        <span key={i} className="m-w" aria-hidden="true">
          <span className="m-w__in">{t.kind === 'word' ? t.text : t.node}</span>
        </span>
      ),
    )
  } else if (units) {
    const breaks = lock.state === 'locked' ? lock.breaks : null
    content = tokens.map((t, i) => {
      if (t.kind === 'space') return ' '
      const unit = unitOf[i]
      const br = unit !== undefined && breaks?.has(unit) ? <br className="ly-br" /> : null
      const body = t.kind === 'node' ? t.node : (
        <span className="ly-u" style={{ whiteSpace: 'nowrap' }} aria-hidden="true">
          {letters ? [...t.text].map((ch, k) => <span key={k} className="ly-l inline-block [font-stretch:var(--wd,inherit)] [font-weight:var(--w,inherit)] transition-[font-weight,font-stretch] duration-320 ease-ui motion-reduce:transition-none">{ch}</span>) : t.text}
        </span>
      )
      return <Fragment key={i}>{br}{body}</Fragment>
    })
  }

  const reworked = masks || units
  return (
    <h1
      ref={ref}
      id={titleId}
      className={cx(
        'text-[clamp(40px,3.048vw+28.11px,72px)] leading-[1.02] tracking-[var(--display-tracking-xl,var(--display-tracking))]',
        // locked: the measured lines are fixed, so nothing may re-wrap them
        units && lock.state === 'locked' ? 'whitespace-nowrap [text-wrap:nowrap]' : 'text-balance',
        className,
      )}
      data-ly-letters={letters}
      aria-label={reworked || hasMark ? label : undefined}
    >
      {content}
    </h1>
  )
}

/** Letters near a fine pointer take a heavier weight (and a wider width on `wdth`), set per letter
    as CSS variables the letters read; nothing re-renders while the pointer moves. */
function useLetters(ref: RefObject<HTMLHeadingElement | null>, letters: 'wght' | 'wdth' | undefined): void {
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  useEffect(() => {
    const h1 = ref.current
    const host = h1?.closest<HTMLElement>('.hero') ?? h1
    if (!letters || !fine || reduced || !h1 || !host) return
    const cs = getComputedStyle(h1)
    const base = parseFloat(cs.fontWeight) || 400
    const heavy = Math.min(900, base + 200)
    const baseWidth = parseFloat(cs.fontStretch) || 100
    let boxes: Array<[number, number]> | null = null
    let px = 0, py = 0, on = false, raf = 0
    const ls = () => [...h1.querySelectorAll<HTMLElement>('.ly-l')]
    const draw = () => {
      raf = 0
      const list = ls()
      if (!boxes || boxes.length !== list.length) {
        boxes = list.map(l => {
          const r = l.getBoundingClientRect()
          return [r.left + r.width / 2 + scrollX, r.top + r.height / 2 + scrollY]
        })
      }
      const reach = parseFloat(getComputedStyle(h1).fontSize) * 2.4
      list.forEach((l, i) => {
        const box = boxes?.[i]
        if (!box) return
        const [x, y] = box
        const d = on ? Math.hypot(px + scrollX - x, py + scrollY - y) : Infinity
        const k = Math.max(0, 1 - d / reach)
        const e = k * k * (3 - 2 * k)
        l.style.setProperty('--w', String(Math.round(base + (heavy - base) * e)))
        if (letters === 'wdth') l.style.setProperty('--wd', `${(baseWidth + 10 * e).toFixed(1)}%`)
      })
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(draw) }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      on = true
      px = e.clientX
      py = e.clientY
      queue()
    }
    const leave = () => {
      on = false
      boxes = null
      queue()
    }
    const forget = () => { boxes = null }
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    window.addEventListener('resize', forget)
    return () => {
      cancelAnimationFrame(raf)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
      window.removeEventListener('resize', forget)
    }
  }, [ref, letters, fine, reduced])
}
