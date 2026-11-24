import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { http, parseRetryAfter, readCookie } from './http'

const fetchMock = vi.fn<typeof fetch>()

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  const type = status >= 400 ? 'application/problem+json' : 'application/json'
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type, ...headers } })
}

/** What the last fetch was called with. */
function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? []
  return { url, init: init ?? {}, headers: new Headers(init?.headers) }
}

async function errorOf(call: Promise<unknown>): Promise<ApiError> {
  const error = await call.then(() => undefined, (e: unknown) => e)
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('document', { cookie: 'theme=dark; XSRF-TOKEN=first-token' })
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('http', () => {
  it('sends a GET with its query, cookies and no token of any kind', async () => {
    fetchMock.mockResolvedValue(json(200, { id: 1 }))
    const answer = await http<{ id: number }>('/api/communities', { query: { sort: 'top', name: 'front end', page: 0, size: undefined } })

    expect(answer).toEqual({ id: 1 })
    const { url, init, headers } = lastCall()
    expect(url).toBe('/api/communities?sort=top&name=front+end&page=0')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('same-origin')
    expect(headers.has('Authorization')).toBe(false)
    expect(headers.has('X-XSRF-TOKEN')).toBe(false)
  })

  it('sends a JSON body with the CSRF cookie read again for every write', async () => {
    fetchMock.mockImplementation(async () => json(200, {}))
    await http('/api/communities', { method: 'POST', body: { name: 'frontend' } })
    expect(lastCall().init.body).toBe('{"name":"frontend"}')
    expect(lastCall().headers.get('Content-Type')).toBe('application/json')
    expect(lastCall().headers.get('X-XSRF-TOKEN')).toBe('first-token')

    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=second-token' })
    await http('/api/communities/frontend', { method: 'DELETE' })
    expect(lastCall().headers.get('X-XSRF-TOKEN')).toBe('second-token')
  })

  it('sends a form as it is, and leaves the gateway token out when asked (login)', async () => {
    fetchMock.mockResolvedValue(json(200, { redirectUrl: '/' }))
    const form = new URLSearchParams({ email: 'ana@levi9.com', password: 'secret' })
    await http('/api/auth/login', { method: 'POST', body: form, xsrf: false, headers: { 'X-CSRF-TOKEN': 'auth-token' } })

    const { init, headers } = lastCall()
    expect(init.body).toBe(form)
    expect(headers.has('Content-Type')).toBe(false) // fetch adds the form's own
    expect(headers.has('X-XSRF-TOKEN')).toBe(false)
    expect(headers.get('X-CSRF-TOKEN')).toBe('auth-token')
  })

  it('answers undefined when there is no body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    expect(await http('/api/communities/frontend/members/me', { method: 'PUT' })).toBeUndefined()
  })

  it('turns problem details into an ApiError', async () => {
    fetchMock.mockResolvedValue(json(409, { title: 'Conflict', detail: 'Username is taken', errorType: 'USERNAME_TAKEN' }))
    const error = await errorOf(http('/api/auth/register', { method: 'POST', body: {} }))
    expect([error.status, error.errorType, error.message]).toEqual([409, 'USERNAME_TAKEN', 'Username is taken'])

    fetchMock.mockResolvedValue(json(400, { status: 400, errors: [{ field: 'username', message: 'must not be blank' }] }))
    expect((await errorOf(http('/api/auth/register'))).errors).toEqual([{ field: 'username', message: 'must not be blank' }])
  })

  it('still answers an ApiError when the error is not problem details', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }))
    const error = await errorOf(http('/api/me'))
    expect([error.status, error.message]).toEqual([502, 'Bad Gateway'])
  })

  it('keeps how long Retry-After says to wait', async () => {
    fetchMock.mockResolvedValue(json(503, { title: 'Service Unavailable' }, { 'Retry-After': '5' }))
    expect((await errorOf(http('/api/me'))).retryAfter).toBe(5)

    fetchMock.mockResolvedValue(json(401, { title: 'Unauthorized' }))
    expect((await errorOf(http('/api/me'))).retryAfter).toBeUndefined()
  })
})

describe('parseRetryAfter', () => {
  it('reads seconds or a date', () => {
    const now = Date.parse('2026-11-24T10:00:00Z')
    expect(parseRetryAfter('30', now)).toBe(30)
    expect(parseRetryAfter('Tue, 24 Nov 2026 10:00:12 GMT', now)).toBe(12)
    expect(parseRetryAfter('Tue, 24 Nov 2026 09:00:00 GMT', now)).toBe(0)
    expect(parseRetryAfter('soon', now)).toBeUndefined()
    expect(parseRetryAfter(null, now)).toBeUndefined()
  })
})

describe('readCookie', () => {
  it('finds one cookie among several', () => {
    vi.stubGlobal('document', { cookie: 'a=1; XSRF-TOKEN=abc%3D%3D; b=2' })
    expect(readCookie('XSRF-TOKEN')).toBe('abc==')
    expect(readCookie('missing')).toBeUndefined()
  })
})
