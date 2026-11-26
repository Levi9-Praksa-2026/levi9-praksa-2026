import { describe, expect, it } from 'vitest'
import { nextVote, scoreWith } from './vote'

describe('nextVote', () => {
  it('casts, takes back and switches', () => {
    expect(nextVote(null, 1)).toBe(1)
    expect(nextVote(1, 1)).toBeNull()
    expect(nextVote(1, -1)).toBe(-1)
    expect(nextVote(-1, -1)).toBeNull()
  })
})

describe('scoreWith', () => {
  it('moves by new minus old, from the vote the server already counted', () => {
    expect(scoreWith(10, null, null)).toBe(10)
    expect(scoreWith(10, null, 1)).toBe(11)
    expect(scoreWith(10, 1, null)).toBe(9)
    expect(scoreWith(10, -1, 1)).toBe(12)
  })
})
