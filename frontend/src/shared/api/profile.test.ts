import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { getMyProfileOverview, updateMyName } from './profile'

const fetchMock = vi.fn<typeof fetch>()

function json(status: number, body: unknown): Response {
  const type = status >= 400 ? 'application/problem+json' : 'application/json'
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=gateway-token' })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('profile data', () => {
  it('reads the real account and leaves recent posts empty until an overview endpoint exists', async () => {
    fetchMock.mockResolvedValue(json(200, {
      id: 1, username: 'demo_user', email: 'demo@example.com', firstName: 'Demo', lastName: 'User',
    }))

    expect(await getMyProfileOverview()).toEqual({
      username: 'demo_user',
      firstName: 'Demo',
      lastName: 'User',
      recentPosts: [],
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/users/me')
  })

  it('sends the name change to the real PATCH /api/users/me with CSRF', async () => {
    fetchMock.mockResolvedValue(json(200, {
      id: 1, username: 'demo_user', email: 'demo@example.com', firstName: 'Ada', lastName: 'Lovelace',
    }))

    expect((await updateMyName('Ada', 'Lovelace')).firstName).toBe('Ada')
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect([url, init?.method]).toEqual(['/api/users/me', 'PATCH'])
    expect(JSON.parse(String(init?.body))).toEqual({ firstName: 'Ada', lastName: 'Lovelace' })
    expect(new Headers(init?.headers).get('X-XSRF-TOKEN')).toBe('gateway-token')
  })

  it('passes backend failures through as ApiError', async () => {
    fetchMock.mockResolvedValue(json(401, { status: 401, title: 'Unauthorized', detail: 'Log in first' }))
    const error = await getMyProfileOverview().then(() => undefined, (e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
  })
})
