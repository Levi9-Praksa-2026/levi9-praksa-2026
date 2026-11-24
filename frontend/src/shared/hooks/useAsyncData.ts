import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncData<T> {
  data: T | undefined
  /** What the load threw: usually an ApiError (src/shared/api/errors.ts). */
  error: unknown
  loading: boolean
  /** Loads the same key again (a "Try again" button). */
  retry: () => void
}

/**
 * One piece of server data for a screen: `data`, `loading` and `error`, loaded again whenever `key`
 * changes. `key` names what is loaded ("community:frontend"); null loads nothing. An answer for an old
 * key is dropped, so a slow first request can never overwrite a newer one.
 */
export function useAsyncData<T>(key: string | null, load: () => Promise<T>): AsyncData<T> {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ id: string; data?: T; error?: unknown } | null>(null)
  const id = key === null ? null : `${key}#${attempt}`

  // the latest load function, without making the effect below run on every render
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (id === null) return
    let live = true
    loadRef.current().then(
      data => live && setResult({ id, data }),
      (error: unknown) => live && setResult({ id, error: error ?? new Error('Request failed') }),
    )
    return () => {
      live = false
    }
  }, [id])

  const retry = useCallback(() => setAttempt(a => a + 1), [])
  const current = result?.id === id ? result : null
  return { data: current?.data, error: current?.error ?? null, loading: id !== null && current === null, retry }
}
