import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/Button'
import { PhotoImg, type Photo } from '@/shared/ui/Media'
import { cx } from '@/shared/lib/env'
import { AppLink } from '@/shared/ui/Link'
import type { ActionItem, LinkItem } from '@/shared/ui/types'
import { Brand, type BrandProps } from '@/shared/ui/layout/Brand'

/** Row 1, the close. type: the h2 and the big button across the wrap; word: the name set across it;
    photo: a second photograph (never the hero's) down to the links. */
export type CloseType =
  | { type: 'type' }
  | { type: 'word' }
  | { type: 'photo'; photo: Photo }

/** Row 2, the footer: columns, a dark band, the lit slab (tech only) or a visit block (a door). */
export type FooterType = 'columns' | 'dark' | 'statement' | 'visit'

export type FooterColumns =
  | readonly [FooterColumn]
  | readonly [FooterColumn, FooterColumn]
  | readonly [FooterColumn, FooterColumn, FooterColumn, FooterColumn]

export interface FooterColumn {
  title: string
  links: readonly LinkItem[]
}

export interface ClosingProps {
  id?: string
  close: CloseType
  footer: FooterType
  /** The h2: the main action, plainly. */
  title: string
  /** One line: the trial, the price, the reply time. */
  line: string
  primary: ActionItem
  brand: BrandProps
  /** What the company does, in one plain line. */
  lede: string
  /** One, two or four columns of links that exist: together they fill the eight columns beside the
      name, so the last one ends on the container's right line. */
  columns: FooterColumns
  /** The legal line: the year and the owner ("© 2026 Fundbook Ltd"). */
  legal: string
  legalLinks?: readonly LinkItem[]
  /** The client's accounts, only when the brief gives them. */
  socials?: ReactNode
  /** The one credits line for photographs. */
  credits?: LinkItem
  /** For `footer: 'visit'`: the address set large and the hours, in place of the columns. */
  visit?: ReactNode
}

function CloseRow({ close, title, line, primary, name, headingId }: Pick<ClosingProps, 'close' | 'title' | 'line' | 'primary'> & { name: string; headingId: string }) {
  const button = (big: boolean) => (
    <Button href={primary.href} onClick={primary.onClick} arrow size={big ? 'xl' : 'md'} wide={big}>{primary.label}</Button>
  )
  if (close.type === 'type') {
    return (
      <div className="closing__cta close--type">
        <div className="section-head">
          <h2 id={headingId}>{title}</h2>
          <p>{line}</p>
        </div>
        {button(true)}
      </div>
    )
  }
  const head = (
    <div className="section-head--split">
      <div>
        <h2 id={headingId}>{title}</h2>
        <p className="t-lead">{line}</p>
      </div>
      {button(false)}
    </div>
  )
  if (close.type === 'word') {
    return (
      <div className="closing__cta close--word">
        {head}
        <p className="close__word" aria-hidden="true">{name}</p>
      </div>
    )
  }
  return (
    <div className="closing__cta close--photo">
      {head}
      <div className="close__media"><PhotoImg photo={close.photo} /></div>
    </div>
  )
}

/**
 * The page's last section: row 1 the close with the main action,
 * row 2 the footer. Both rows are chosen.
 */
export function Closing(props: ClosingProps) {
  const { id = 'contact', close, footer, brand, lede, columns, legal, legalLinks = [], socials, credits, visit } = props
  const headingId = `${id}-h`
  return (
    <footer
      id={id}
      className={cx('footer closing', footer !== 'columns' && `footer--${footer}`, footer === 'dark' && 'ground-inverse')}
      aria-labelledby={headingId}
    >
      <div className="wrap">
        <CloseRow close={close} title={props.title} line={props.line} primary={props.primary} name={brand.name} headingId={headingId} />
        <div className="closing__links">
          {visit ?? (
            <div className="grid ui-grid">
              <div className="span-4 stack-4">
                <Brand {...brand} />
                <p className="footer__lede">{lede}</p>
              </div>
              {columns.map(col => (
                <div key={col.title} className={`span-${8 / columns.length} footer__col`}>
                  <h3>{col.title}</h3>
                  <ul>
                    {col.links.map(link => (
                      <li key={link.href + link.label}><AppLink href={link.href}>{link.label}</AppLink></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="footer__legal">
            <span>
              {legal}
              {legalLinks.map(link => (
                <span key={link.href}>{'  '}<AppLink href={link.href}>{link.label}</AppLink></span>
              ))}
            </span>
            <div className="socials">{socials}</div>
            {credits && <AppLink className="credits" href={credits.href}>{credits.label}</AppLink>}
          </div>
        </div>
      </div>
    </footer>
  )
}
