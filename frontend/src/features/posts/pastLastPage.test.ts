import { describe, expect, it } from 'vitest'
import { pastLastPage } from './pastLastPage'

describe('pastLastPage', () => {
  it('moves a page past the end to the last page', () => {
    expect(pastLastPage(9, 3, false)).toBe(2)
    expect(pastLastPage(3, 3, false)).toBe(2)
  })

  it('stays on a page that exists, and when there is nothing to page through', () => {
    expect(pastLastPage(2, 3, false)).toBeNull()
    expect(pastLastPage(0, 0, false)).toBeNull()
    expect(pastLastPage(4, undefined, false)).toBeNull()
  })

  /** Back to ?page=4 after the feed grew: the old answer said 3 pages, the new one will say 6. */
  it('waits while the previous page is on screen, since its page count may be out of date', () => {
    expect(pastLastPage(4, 3, true)).toBeNull()
  })
})
