'use client'
import { useEffect, useRef, useState } from 'react'
import { useLoop } from '@/shared/hooks/useLoop'

export interface LiveWordProps {
  /** The first word is the one at rest (and the one read aloud); the rest take turns. */
  words: readonly [string, string, ...string[]]
}

/**
 * One live word in a word hero's h1: it changes every 2 s for two rounds,
 * rests on the first word, and plays a round again when a mouse enters the headline. The slot is as
 * wide as its widest word, so no other word moves. Use it only inside `<HeroTitle>`.
 */
export function LiveWord({ words }: LiveWordProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [at, setAt] = useState(0)
  const [out, setOut] = useState<number | null>(null)
  const atRef = useRef(0)

  const loop = useLoop(
    ref,
    async ({ wait }) => {
      for (let n = 1; n <= words.length; n++) {
        await wait(2000)
        const cur = atRef.current
        const next = (cur + 1) % words.length
        atRef.current = next
        setOut(cur)
        setAt(next)
        await wait(620)
        setOut(null)
      }
    },
    {
      cycles: 2,
      rest: 900,
      still: () => {
        atRef.current = 0
        setAt(0)
        setOut(null)
      },
    },
  )

  const { live, restart } = loop
  useEffect(() => {
    const h1 = ref.current?.closest('h1')
    if (!h1 || !live) return
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') restart()
    }
    h1.addEventListener('pointerenter', onEnter)
    return () => h1.removeEventListener('pointerenter', onEnter)
  }, [live, restart])

  return (
    <span ref={ref} className="ly-word">
      {words.map((word, k) => (
        <span key={word} aria-hidden="true" className={k === at ? undefined : k === out ? 'is-out' : 'is-next'}>
          {word}
        </span>
      ))}
    </span>
  )
}
