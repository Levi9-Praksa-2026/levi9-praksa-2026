import { useEffect, useState } from 'react'

/** `value`, but only once it has stopped changing for `ms`: a search waits for the typing to pause. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}
