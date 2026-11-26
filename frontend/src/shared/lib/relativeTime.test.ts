import { describe, expect, it } from 'vitest'
import { relativeTime } from './relativeTime'

const NOW = new Date('2026-11-25T12:00:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('relativeTime', () => {
  it('says "just now" under a minute, and for a date slightly in the future', () => {
    expect(relativeTime(ago(59_000), NOW)).toBe('just now')
    expect(relativeTime(ago(-30_000), NOW)).toBe('just now')
  })

  it('moves to the next unit at each boundary', () => {
    expect(relativeTime(ago(MINUTE), NOW)).toBe('1m ago')
    expect(relativeTime(ago(59 * MINUTE), NOW)).toBe('59m ago')
    expect(relativeTime(ago(HOUR), NOW)).toBe('1h ago')
    expect(relativeTime(ago(23 * HOUR), NOW)).toBe('23h ago')
    expect(relativeTime(ago(DAY), NOW)).toBe('1d ago')
    expect(relativeTime(ago(29 * DAY), NOW)).toBe('29d ago')
    expect(relativeTime(ago(30 * DAY), NOW)).toBe('1mo ago')
    expect(relativeTime(ago(360 * DAY), NOW)).toBe('1y ago')
  })

  it('gives an empty string for a date it cannot read', () => {
    expect(relativeTime('not a date', NOW)).toBe('')
  })
})
