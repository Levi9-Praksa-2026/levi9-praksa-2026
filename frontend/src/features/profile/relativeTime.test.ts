import { describe, expect, it } from 'vitest'
import { relativeTime } from './relativeTime'

const now = new Date('2026-11-25T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

describe('relativeTime', () => {
  it('uses the smallest useful unit', () => {
    expect(relativeTime(ago(30_000), now)).toBe('just now')
    expect(relativeTime(ago(12 * 60_000), now)).toBe('12m ago')
    expect(relativeTime(ago(5 * 3_600_000), now)).toBe('5h ago')
    expect(relativeTime(ago(12 * 86_400_000), now)).toBe('12d ago')
    expect(relativeTime(ago(60 * 86_400_000), now)).toBe('2mo ago')
    expect(relativeTime(ago(400 * 86_400_000), now)).toBe('1y ago')
  })

  it('never shows a future date or a broken one', () => {
    expect(relativeTime(new Date(now.getTime() + 60_000).toISOString(), now)).toBe('just now')
    expect(relativeTime('not a date', now)).toBe('')
  })
})
