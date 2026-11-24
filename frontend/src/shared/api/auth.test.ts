import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, logout } from './auth'

const fetchMock = vi.fn<typeof fetch>()

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=gateway-token' })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('auth', () => {
  it('asks the gateway who is logged in', async () => {
    fetchMock.mockResolvedValue(json(200, { id: 42, username: 'marko', roles: ['USER'] }))
    expect(await getMe()).toEqual({ id: 42, username: 'marko', roles: ['USER'] })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/me')
  })

  it('logs out with the gateway CSRF token and answers where to go next', async () => {
    fetchMock.mockResolvedValue(json(200, { redirectUrl: '/connect/logout?id_token_hint=x' }))
    expect(await logout()).toEqual({ redirectUrl: '/connect/logout?id_token_hint=x' })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect([url, init?.method]).toEqual(['/logout', 'POST'])
    expect(new Headers(init?.headers).get('X-XSRF-TOKEN')).toBe('gateway-token')
  })
})
