import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useDesktopNav } from '@/shared/hooks/useMediaQuery'

const STORAGE_KEY = 'levddit.sidebar'

export interface SidebarState {
  /** 1024px and up: the sidebar sits beside the page; under it, a drawer over the page. */
  desktop: boolean
  /** Desktop: open, or collapsed to the rail. Remembered between visits. */
  expanded: boolean
  toggleExpanded: () => void
  /** Phone and tablet: the drawer is open. */
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

function readExpanded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'collapsed'
  } catch {
    return true
  }
}

/** The sidebar's open state: collapsible on desktop, a drawer on smaller screens that closes when you navigate or press Escape. */
export function useSidebar(): SidebarState {
  const desktop = useDesktopNav()
  const [expanded, setExpanded] = useState(readExpanded)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // a new page or reaching the desktop width closes the drawer (state adjusted while rendering, not in an effect)
  const [seen, setSeen] = useState({ pathname, desktop })
  if (seen.pathname !== pathname || seen.desktop !== desktop) {
    setSeen({ pathname, desktop })
    setDrawerOpen(false)
  }

  const toggleExpanded = useCallback(() => {
    setExpanded(was => {
      try {
        localStorage.setItem(STORAGE_KEY, was ? 'collapsed' : 'expanded')
      } catch {
        // private mode or blocked storage: it just isn't remembered
      }
      return !was
    })
  }, [])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return { desktop, expanded, toggleExpanded, drawerOpen, setDrawerOpen }
}
