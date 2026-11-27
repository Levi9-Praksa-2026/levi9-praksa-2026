import { describe, expect, it, vi } from 'vitest'
import { QueryObserver } from '@tanstack/react-query'
import { getMe } from '@/shared/api/auth'
import { ApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { createQueryClient, retryDelay, shouldRetry } from './queryClient'

const status = (code: number, retryAfter?: number) => new ApiError({ status: code }, retryAfter)

describe('shouldRetry', () => {
  it('never asks again after a 4xx', () => {
    for (const code of [400, 401, 403, 404, 409, 429]) expect(shouldRetry(0, status(code))).toBe(false)
  })

  it('waits for the gateway a few times on a 503', () => {
    expect([0, 1, 2, 3].map(n => shouldRetry(n, status(503)))).toEqual([true, true, true, false])
  })

  it('tries once more after a 500 or a network failure', () => {
    expect([shouldRetry(0, status(500)), shouldRetry(1, status(500))]).toEqual([true, false])
    expect([shouldRetry(0, new TypeError('Failed to fetch')), shouldRetry(1, new TypeError('Failed to fetch'))]).toEqual([true, false])
  })
})

describe('retryDelay', () => {
  it('waits as long as Retry-After says, or backs off up to 8 s', () => {
    expect(retryDelay(0, status(503, 5))).toBe(5000)
    expect([0, 1, 2, 3, 4].map(n => retryDelay(n, status(500)))).toEqual([1000, 2000, 4000, 8000, 8000])
  })
})

describe('a 401 while the page is open', () => {
  it('replaces the cached user with null after the session ends', async () => {
    const client = createQueryClient()
    const user = { id: 42, username: 'marko', roles: ['USER'] }
    client.setQueryData(queryKeys.me, user)
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const observer = new QueryObserver(client, { queryKey: queryKeys.me, queryFn: getMe })
    const unsubscribe = observer.subscribe(() => {})
    try {
      await expect(client.fetchQuery({
        queryKey: queryKeys.communities.detail('frontend'),
        queryFn: () => Promise.reject(status(401)),
      })).rejects.toMatchObject({ status: 401 })
      await vi.waitFor(() => expect(client.getQueryData(queryKeys.me)).toBeNull())
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(client.getQueryState(queryKeys.me)?.status).toBe('success')
    } finally {
      unsubscribe()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it('asks "me" again, unless "me" itself answered it', async () => {
    const client = createQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const fail = () => Promise.reject(status(401))

    await client.fetchQuery({ queryKey: queryKeys.communities.detail('frontend'), queryFn: fail }).catch(() => {})
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.me })

    invalidate.mockClear()
    await client.fetchQuery({ queryKey: queryKeys.me, queryFn: fail }).catch(() => {})
    expect(invalidate).not.toHaveBeenCalled()
  })
})
