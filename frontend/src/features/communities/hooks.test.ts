import { describe, expect, it, vi } from 'vitest'
import type { PageResponse } from '@/shared/api/contracts/common'
import type { CommunityListParams, CommunityResponse } from '@/shared/api/contracts/communities'
import { findInactiveCommunity } from './hooks'

/** A stand-in for the admin list: every 100 names make a page, like the backend's `size` limit. */
function listFor(names: string[]) {
  const totalPages = Math.max(1, Math.ceil(names.length / 100))
  const pages: PageResponse<CommunityResponse>[] = Array.from({ length: totalPages }, (_, page) => ({
    content: names.slice(page * 100, (page + 1) * 100).map(name => ({ name, memberCount: 1 })),
    page,
    size: 100,
    totalElements: names.length,
    totalPages,
  }))
  return vi.fn(async ({ page = 0 }: CommunityListParams) => pages[page] ?? pages[0]!)
}

describe('findInactiveCommunity', () => {
  it('keeps the exact match from the first page, not a substring match', async () => {
    const list = listFor(['retrospective', 'retro', 'retro-archive'])

    expect(await findInactiveCommunity('retro', list)).toMatchObject({ name: 'retro' })
    expect(list).toHaveBeenCalledExactlyOnceWith({ inactive: true, name: 'retro', page: 0, size: 100 })
  })

  it('paginates past 100 newer substring matches to find the community', async () => {
    const list = listFor([
      ...Array.from({ length: 100 }, (_, i) => `retro-clone-${i}`),
      'retro-archive',
      'retro',
    ])

    expect(await findInactiveCommunity('retro', list)).toMatchObject({ name: 'retro' })
    expect(list.mock.calls.map(([params]) => params.page)).toEqual([0, 1])
  })

  it('matches regardless of case and stops as soon as the community is found', async () => {
    const list = listFor(['Retro-archive', 'RETRO', 'retro-later'])

    expect(await findInactiveCommunity('retro', list)).toMatchObject({ name: 'RETRO' })
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('returns null only after checking every page when there is no exact match', async () => {
    const list = listFor(Array.from({ length: 150 }, (_, i) => `retro-${i}`))

    expect(await findInactiveCommunity('retro', list)).toBeNull()
    expect(list.mock.calls.map(([params]) => params.page)).toEqual([0, 1])
  })

  it('returns null for an empty admin list', async () => {
    const list = listFor([])

    expect(await findInactiveCommunity('retro', list)).toBeNull()
    expect(list).toHaveBeenCalledTimes(1)
  })
})
