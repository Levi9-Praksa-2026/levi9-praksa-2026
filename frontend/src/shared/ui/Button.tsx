'use client'
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { cx } from '@/shared/lib/env'
import { AppLink } from '@/shared/ui/Link'
import type { ActionItem } from '@/shared/ui/types'

export type ButtonVariant = 'primary' | 'secondary'
export type ButtonSize = 'md' | 'sm' | 'xl'

interface ButtonLookProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Across its row (the closing band's big button). */
  wide?: boolean
  /** The drawn arrow after the words (the main action in a hero or a close). */
  arrow?: boolean
  className?: string
  children: ReactNode
}

export type LinkButtonProps = ButtonLookProps & {
  href: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export type ActionButtonProps = ButtonLookProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
  href?: undefined
}

export type ButtonProps = LinkButtonProps | ActionButtonProps

/** The design system's drawn arrow (motion.css nudges it on hover). */
export function Arrow() {
  return (
    <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path className="m-arrow__stem" d="M1 6h8" />
      <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  )
}

/**
 * The design system's button (`.btn`): a link when it has an href (through the app's router link), a
 * `<button>` otherwise. Its look comes from `<html data-buttons>`, so the markup never changes
 * with the deal. Words: a verb and an object ("Start a free trial").
 */
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', wide = false, arrow = false, className, children } = props
  const classes = cx('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, wide && 'btn--wide', className)
  const content = (
    <>
      {children}
      {arrow && <Arrow />}
    </>
  )
  if (props.href !== undefined) {
    return <AppLink className={classes} href={props.href} onClick={props.onClick}>{content}</AppLink>
  }
  const { variant: _v, size: _s, wide: _w, arrow: _a, className: _c, children: _ch, href: _h, type = 'button', ...rest } = props
  return <button type={type} className={classes} {...rest}>{content}</button>
}

export interface ButtonRowProps {
  /** The one main action. */
  primary: ActionItem
  /** At most one more, quieter. */
  secondary?: ActionItem
  /** Draw the arrow on the main action. */
  arrow?: boolean
}

/** A hero's or a section's action row: the main action and at most one quieter one. */
export function ButtonRow({ primary, secondary, arrow = false }: ButtonRowProps) {
  return (
    <div className="btn-row">
      <Button href={primary.href} onClick={primary.onClick} arrow={arrow}>{primary.label}</Button>
      {secondary && <Button variant="secondary" href={secondary.href} onClick={secondary.onClick}>{secondary.label}</Button>}
    </div>
  )
}
