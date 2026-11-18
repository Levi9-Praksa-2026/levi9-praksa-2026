'use client'
import { useRef, type ReactNode } from 'react'
import { Button } from '@/shared/ui/Button'
import { cx } from '@/shared/lib/env'
import { AppLink } from '@/shared/ui/Link'
import type { ActionItem, LinkItem } from '@/shared/ui/types'
import { Brand, type BrandProps } from '@/shared/ui/layout/Brand'
import { useNavSheet } from '@/shared/hooks/useNavSheet'
import { useScrollSpy } from '@/shared/hooks/useScrollSpy'

export interface NavMenuLink extends LinkItem {
  /** What it does, in about five words. */
  note?: string
}

export interface NavMenuColumn {
  title: string
  links: readonly NavMenuLink[]
}

export interface NavMenuCard extends LinkItem {
  /** One line under the title. */
  line: string
  /** The panel's picture: the client's photograph (`img.frame__img`) or one fragment. */
  visual: ReactNode
}

/** A nav word's panel: link columns and one card (nav-mega), or three or four cards (nav-cards). */
export interface NavMenu {
  columns?: readonly NavMenuColumn[]
  cards?: readonly NavMenuCard[]
}

export interface NavItem extends LinkItem {
  menu?: NavMenu
  /** The page this word leads to is the one on screen. */
  current?: boolean
}

/** The chosen nav: mega and cards differ only in their menus; centre and split move the words. */
export type NavType = 'mega' | 'cards' | 'centre' | 'split'

export interface NavProps {
  type: NavType
  brand: BrandProps
  /** Four or five words at most; each names a section or page that exists. */
  items: readonly NavItem[]
  /** The main action, the one button. */
  primary: ActionItem
  /** A plain word before it, only for something real (Sign in on an app with accounts). */
  secondary?: ActionItem
  /** The bar on the page's inverse ground (`nav--tone`). */
  tone?: boolean
  /** Where the skip link goes (the main element's id) and its words in the page's language. */
  skipTo?: string
  skipLabel?: string
  /** Mark the in-page link whose section is on screen (`aria-current="location"`). On by default. */
  spy?: boolean
}

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Card columns: three cards take four columns each, four take three. */
function cardSpan(count: number): string {
  return count >= 4 ? 'span-3' : 'span-4'
}

function MenuPanel({ menu }: { menu: NavMenu }) {
  const cards = menu.cards ?? []
  const columns = menu.columns ?? []
  return (
    <div className="nav__menu">
      <div className="wrap grid ui-grid">
        {columns.map(col => (
          <div key={col.title} className="menu-col span-3">
            <p className="t-label">{col.title}</p>
            {col.links.map(link => (
              <AppLink key={link.href + link.label} href={link.href}>
                {link.label}
                {link.note && <span>{link.note}</span>}
              </AppLink>
            ))}
          </div>
        ))}
        {cards.map(card => (
          <AppLink
            key={card.href + card.label}
            href={card.href}
            className={cx('menu-card', columns.length ? 'span-3 start-10' : cardSpan(cards.length))}
          >
            <div className="panel">{card.visual}</div>
            <span className="t-card">{card.label}</span>
            <span className="t-small muted">{card.line}</span>
          </AppLink>
        ))}
      </div>
    </div>
  )
}

/**
 * The design system's fixed nav: the name and mark, the words with hover
 * panels on desktop, the main action, and the phone sheet with its accordion under 1024px.
 * Every state is React state; the design system's CSS draws it from `.is-open`, `.is-expanded` and
 * `.m-menu-open`.
 */
export function Nav({ type, brand, items, primary, secondary, tone = false, skipTo = '#top', skipLabel = 'Skip to content', spy = true }: NavProps) {
  const navRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const sheet = useNavSheet(navRef, toggleRef)
  const onScreen = useScrollSpy(items.map(item => item.href), spy)

  return (
    <header
      ref={navRef}
      className={cx('nav', (type === 'centre' || type === 'split') && `nav--${type}`, tone && 'nav--tone', sheet.open && 'is-open', sheet.menuOpen && 'm-menu-open')}
      data-m-nav="1"
      onPointerLeave={sheet.leaveBar}
    >
      <div className="wrap nav__bar">
        <a className="skip-link" href={skipTo}>{skipLabel}</a>
        <Brand {...brand} />
        <nav className="nav__links" aria-label="Main">
          {items.map(item => {
            const key = item.href + item.label
            const expanded = sheet.expanded.has(key)
            return (
              <div key={key} className={cx('nav__item', expanded && 'is-expanded')} onPointerEnter={() => sheet.enterItem(!!item.menu)}>
                <AppLink className="nav__link" href={item.href} aria-current={item.current ? 'page' : onScreen === item.href ? 'location' : undefined}>
                  {item.label}
                  {item.menu && <Chevron />}
                </AppLink>
                {item.menu && (
                  <button
                    type="button"
                    className="nav__expand"
                    aria-label={`Show ${item.label} links`}
                    aria-expanded={expanded}
                    onClick={() => sheet.toggleItem(key)}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                {item.menu && <MenuPanel menu={item.menu} />}
              </div>
            )
          })}
        </nav>
        <div className="nav__actions">
          {secondary && <AppLink className="nav__link" href={secondary.href} onClick={secondary.onClick}>{secondary.label}</AppLink>}
          <Button href={primary.href} onClick={primary.onClick}>{primary.label}</Button>
        </div>
        <button
          ref={toggleRef}
          type="button"
          className="nav__toggle"
          aria-expanded={sheet.open}
          aria-label="Menu"
          onClick={() => sheet.setOpen(!sheet.open)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d={sheet.open ? 'M4 4l10 10M14 4L4 14' : 'M2 5h14M2 13h14'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}
