import { useCallback, useEffect, useState } from 'react'

/** `value`, but only once it has stopped changing for `ms`: a search waits for the typing to pause. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}

export interface DebouncedState<T> {
  /** The live value, e.g. what the input shows. */
  value: T
  /** The value after the pause, e.g. what the API request uses. */
  debounced: T
  setValue: (value: T) => void
  /** Adopt a change from outside immediately, without waiting for the timer (back/forward navigation). */
  jump: (value: T) => void
}

/** A debounced value with a live side, so a search can keep typing local but reset on navigation. */
export function useDebouncedState<T>(initial: T, ms: number): DebouncedState<T> {
  const [value, setValue] = useState(initial)
  const [debounced, setDebounced] = useState(initial)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  const jump = useCallback((next: T) => {
    setValue(next)
    setDebounced(next)
  }, [])

  return { value, debounced, setValue, jump }
}
