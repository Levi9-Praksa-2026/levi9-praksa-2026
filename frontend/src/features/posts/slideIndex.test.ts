import { describe, expect, it } from 'vitest'
import { slideIndex } from './slideIndex'

describe('slideIndex', () => {
  it('picks the slide whose start is nearest the scroll position', () => {
    expect(slideIndex(0, 600, 3)).toBe(0)
    expect(slideIndex(290, 600, 3)).toBe(0)
    expect(slideIndex(310, 600, 3)).toBe(1)
    expect(slideIndex(1200, 600, 3)).toBe(2)
  })

  it('stays inside the strip when it bounces past either end, and before it has a width', () => {
    expect(slideIndex(-40, 600, 3)).toBe(0)
    expect(slideIndex(1500, 600, 3)).toBe(2)
    expect(slideIndex(300, 0, 3)).toBe(0)
  })
})
