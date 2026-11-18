import { useEffect, useLayoutEffect } from 'react'
import { isBrowser } from '@/shared/lib/env'

/** useLayoutEffect in the browser (it runs before the paint), useEffect on a server (no warning). */
export const useIsoLayoutEffect = isBrowser ? useLayoutEffect : useEffect
