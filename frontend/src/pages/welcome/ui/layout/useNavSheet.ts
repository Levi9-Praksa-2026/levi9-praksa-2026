import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useDesktopNav } from '@/shared/hooks/useMediaQuery'

export interface NavSheet {
  /** The phone sheet is open. */
  open: boolean
  setOpen: (open: boolean) => void
  /** Which items' link lists are expanded in the sheet. */
  expanded: ReadonlySet<string>
  toggleItem: (key: string) => void
  /** Desktop: a menu panel has started to show, so the next word swaps it at once. */
  menuOpen: boolean
  /** Desktop: the pointer entered an item; `hasMenu` decides whether a panel is about to show. */
  enterItem: (hasMenu: boolean) => void
  leaveBar: () => void
}

/**
 * Hides an item's menu after Escape: `data-dismissed` switches the item-open variant off (theme.css)
 * until focus leaves the item or the pointer leaves it. React does not render this attribute, so a
 * re-render never clears it early.
 */
function dismiss(item: HTMLElement): void {
  item.dataset.dismissed = ''
  const reset = (e: Event) => {
    if (e instanceof FocusEvent && e.relatedTarget instanceof Node && item.contains(e.relatedTarget)) return
    delete item.dataset.dismissed
    item.removeEventListener('focusout', reset)
    item.removeEventListener('pointerleave', reset)
  }
  item.addEventListener('focusout', reset)
  item.addEventListener('pointerleave', reset)
}

/**
 * The nav's state: the phone sheet with its accordion, closed by
 * Escape (focus back on the toggle), by a tap on any link in it and by reaching the desktop width;
 * the body locked and the rest of the page inert while it is open (it is a modal); the desktop menu
 * intent (150ms); and Escape on a desktop menu, which closes it and leaves focus on its item's link.
 */
export function useNavSheet(navRef: RefObject<HTMLElement | null>, toggleRef: RefObject<HTMLButtonElement | null>): NavSheet {
  const [open, setOpenState] = useState(false)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const desktop = useDesktopNav()
  const [wasDesktop, setWasDesktop] = useState(desktop)
  const intent = useRef(0)

  // reaching the desktop width closes the sheet (state adjusted while rendering, not in an effect)
  if (desktop !== wasDesktop) {
    setWasDesktop(desktop)
    if (desktop) {
      setOpenState(false)
      setExpanded(new Set())
    }
  }

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    if (!next) setExpanded(new Set())
  }, [])

  const toggleItem = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }, [])

  // the body does not scroll under the open sheet
  useEffect(() => {
    document.body.classList.toggle('max-lg:overflow-hidden', open)
    return () => document.body.classList.remove('max-lg:overflow-hidden')
  }, [open])

  // the open sheet is a modal: everything beside the header (main, footer) is inert until it closes
  useEffect(() => {
    const header = navRef.current
    if (!open || !header?.parentElement) return
    const others = [...header.parentElement.children].filter((el): el is HTMLElement => el !== header && el instanceof HTMLElement && !el.inert)
    others.forEach(el => (el.inert = true))
    return () => others.forEach(el => (el.inert = false))
  }, [open, navRef])

  // Escape closes the sheet (focus back on the toggle), or the desktop menu that is showing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (open) {
        setOpen(false)
        toggleRef.current?.focus()
        return
      }
      const nav = navRef.current
      const focused = document.activeElement instanceof HTMLElement && nav?.contains(document.activeElement) ? document.activeElement : null
      const item = focused?.closest<HTMLElement>('.nav-item') ?? nav?.querySelector<HTMLElement>('.nav-item:hover')
      if (!item) return
      dismiss(item)
      setMenuOpen(false)
      // focus stays in the bar, on the item whose menu just closed (not lost to the page)
      if (focused) item.querySelector<HTMLElement>('a[href]')?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen, navRef, toggleRef])

  // a tap on any link in the open sheet closes it, so the page it leads to is never under the sheet
  useEffect(() => {
    const nav = navRef.current
    if (!nav || !open) return
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('a[href]')) setOpen(false)
    }
    nav.addEventListener('click', onClick)
    return () => nav.removeEventListener('click', onClick)
  }, [open, setOpen, navRef])

  const enterItem = useCallback((hasMenu: boolean) => {
    clearTimeout(intent.current)
    if (hasMenu) intent.current = window.setTimeout(() => setMenuOpen(true), 150)
    else setMenuOpen(false)
  }, [])
  const leaveBar = useCallback(() => {
    clearTimeout(intent.current)
    setMenuOpen(false)
  }, [])
  useEffect(() => () => clearTimeout(intent.current), [])

  return { open, setOpen, expanded, toggleItem, menuOpen, enterItem, leaveBar }
}
