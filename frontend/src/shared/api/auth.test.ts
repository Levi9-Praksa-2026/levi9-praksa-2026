import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, login, logout, register } from './auth'
import { ApiError } from './errors'

const fetchMock = vi.fn<typeof fetch>()

function json(status: number, body: unknown): Response {
  const type = status >= 400 ? 'application/problem+json' : 'application/json'
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type } })
}

/** Answers by path: the CSRF endpoint hands out token-1, token-2…; the rest come from `answers` in order. */
function backend(...answers: Response[]) {
  let tokens = 0
  fetchMock.mockImplementation(async url => {
    if (url === '/api/auth/csrf') return json(200, { headerName: 'X-CSRF-TOKEN', token: `token-${++tokens}` })
    const next = answers.shift()
    if (!next) throw new Error(`unexpected request to ${String(url)}`)
    return next
  })
}

/** The calls that weren't for a CSRF token: [url, init]. */
const sent = () => fetchMock.mock.calls.filter(([url]) => url !== '/api/auth/csrf')

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=gateway-token' })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('the gateway session', () => {
  it('asks who is logged in', async () => {
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

describe('login', () => {
  it('posts a form with auth-service\'s token, not the gateway\'s', async () => {
    backend(json(200, { redirectUrl: '/oauth2/authorize?continue' }))
    expect(await login({ email: 'ana@levi9.com', password: 'correct horse battery' })).toEqual({ redirectUrl: '/oauth2/authorize?continue' })

    const [url, init] = sent()[0] ?? []
    const headers = new Headers(init?.headers)
    expect(url).toBe('/api/auth/login')
    expect(String(init?.body)).toBe('email=ana%40levi9.com&password=correct+horse+battery')
    expect(headers.get('X-CSRF-TOKEN')).toBe('token-1')
    expect(headers.has('X-XSRF-TOKEN')).toBe(false)
  })

  it('gets a new token and tries once more after a stale-token 403', async () => {
    backend(json(403, { title: 'Forbidden' }), json(200, { redirectUrl: '/' }))
    expect(await login({ email: 'ana@levi9.com', password: 'x' })).toEqual({ redirectUrl: '/' })
    expect(sent().map(([, init]) => new Headers(init?.headers).get('X-CSRF-TOKEN'))).toEqual(['token-1', 'token-2'])
  })

  it('does not try again for a banned account, a wrong password or a second 403', async () => {
    backend(json(403, { errorType: 'USER_BANNED', banReason: 'Spam' }))
    const banned = await login({ email: 'a@b.c', password: 'x' }).catch((e: unknown) => e)
    expect(banned).toBeInstanceOf(ApiError)
    expect((banned as ApiError).problem.banReason).toBe('Spam')
    expect(sent()).toHaveLength(1)

    fetchMock.mockReset()
    backend(json(401, { errorType: 'INVALID_CREDENTIALS' }))
    expect(((await login({ email: 'a@b.c', password: 'x' }).catch((e: unknown) => e)) as ApiError).status).toBe(401)
    expect(sent()).toHaveLength(1)

    fetchMock.mockReset()
    backend(json(403, {}), json(403, {}))
    expect(((await login({ email: 'a@b.c', password: 'x' }).catch((e: unknown) => e)) as ApiError).status).toBe(403)
    expect(sent()).toHaveLength(2)
  })
})

describe('register', () => {
  it('posts JSON with auth-service\'s token', async () => {
    const request = { username: 'ana_k', email: 'ana@levi9.com', password: 'correct horse battery', firstName: 'Ana', lastName: 'K' }
    backend(json(201, { id: 7, username: 'ana_k', email: 'ana@levi9.com', firstName: 'Ana', lastName: 'K' }))
    expect((await register(request)).id).toBe(7)

    const [url, init] = sent()[0] ?? []
    expect(url).toBe('/api/auth/register')
    expect(JSON.parse(String(init?.body))).toEqual(request)
    expect(new Headers(init?.headers).get('X-CSRF-TOKEN')).toBe('token-1')
  })
})
