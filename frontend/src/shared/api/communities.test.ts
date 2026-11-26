import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { mockSignInAs, resetMockDb } from './mock/db'
import { setMockLatency } from './mock/server'
import {
  createCommunity,
  deactivateCommunity,
  getCommunity,
  getCommunityMembership,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  reactivateCommunity,
  updateCommunityDescription,
} from './communities'

const fetchMock = vi.fn<typeof fetch>()

function json(status: number, body: unknown): Response {
  const type = status >= 400 ? 'application/problem+json' : 'application/json'
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type } })
}

const examplePage = {
  content: [{ name: 'backend', memberCount: 7 }],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

/** The URL of the last request the list function made. */
function lastUrl(): string {
  return fetchMock.mock.calls.at(-1)?.[0] as string
}

async function errorOf(call: Promise<unknown>): Promise<ApiError> {
  const error = await call.then(() => undefined, (e: unknown) => e)
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

beforeEach(() => {
  setMockLatency(0)
  resetMockDb()
})

describe('community list (real API)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async () => json(200, examplePage))
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('sends every filter and returns the page as the backend gives it', async () => {
    expect(await listCommunities({ name: 'back', sort: 'top', page: 0, size: 20 })).toEqual(examplePage)
    expect(lastUrl()).toBe('/api/communities?sort=top&name=back&page=0&size=20')
  })

  it('uses the backend defaults when no filters are given', async () => {
    await listCommunities()
    expect(lastUrl()).toBe('/api/communities?sort=new')
  })

  it('sends inactive only when the admin list is asked for', async () => {
    await listCommunities({ inactive: true, name: 'retro' })
    expect(lastUrl()).toBe('/api/communities?sort=new&name=retro&inactive=true')

    await listCommunities({ inactive: false })
    expect(lastUrl()).toBe('/api/communities?sort=new')
  })

  it('turns a 403 from the admin handler into an ApiError', async () => {
    fetchMock.mockResolvedValue(json(403, { title: 'Forbidden', detail: 'Admins only' }))
    expect((await errorOf(listCommunities({ inactive: true }))).status).toBe(403)
  })
})

describe('one community and joining (real API)', () => {
  const detail = { id: 3, name: 'backend', description: null, memberCount: 7, createdAt: '2026-11-20T10:00:00Z' }

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=gateway-token' })
    fetchMock.mockImplementation(async () => json(200, detail))
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('asks for one community by name and returns it as the backend gives it', async () => {
    expect(await getCommunity('backend')).toEqual(detail)
    expect(lastUrl()).toBe('/api/communities/backend')
  })

  it('turns a 404 for a missing or shut-down community into an ApiError', async () => {
    fetchMock.mockImplementation(async () => json(404, { status: 404, errorType: 'COMMUNITY_NOT_FOUND' }))
    const error = await errorOf(getCommunity('retro'))
    expect([error.status, error.errorType]).toEqual([404, 'COMMUNITY_NOT_FOUND'])
  })

  it('joins with a PUT carrying the CSRF header', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }))
    await joinCommunity('devops')
    const [url, init] = fetchMock.mock.calls[0]!
    expect([url, init?.method]).toEqual(['/api/communities/devops/members/me', 'PUT'])
    expect(new Headers(init?.headers).get('X-XSRF-TOKEN')).toBe('gateway-token')
  })
})

describe('membership and leaving (real API)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=gateway-token' })
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }))
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('asks for the caller\'s membership', async () => {
    fetchMock.mockImplementation(async () => json(200, { joined: true }))
    expect(await getCommunityMembership('backend')).toEqual({ joined: true })
    expect(lastUrl()).toBe('/api/communities/backend/members/me')
  })

  it('leaves with DELETE carrying the CSRF header', async () => {
    await leaveCommunity('devops')
    const [url, init] = fetchMock.mock.calls[0]!
    expect([url, init?.method]).toEqual(['/api/communities/devops/members/me', 'DELETE'])
    expect(new Headers(init?.headers).get('X-XSRF-TOKEN')).toBe('gateway-token')
  })
})

describe('admin create (mocked)', () => {
  it('is refused for a plain user', async () => {
    expect((await errorOf(createCommunity({ name: 'mobile' }))).status).toBe(403)
  })

  it('creates, rejects a taken name in any case, and checks the name pattern', async () => {
    mockSignInAs('admin')
    const created = await createCommunity({ name: 'mobile', description: 'Apps.' })
    expect(created).toMatchObject({ name: 'mobile', memberCount: 0, joined: false })
    const taken = await errorOf(createCommunity({ name: 'FRONTEND' }))
    expect([taken.status, taken.errorType]).toEqual([409, 'COMMUNITY_NAME_TAKEN'])
    expect((await errorOf(createCommunity({ name: 'l/space name' }))).status).toBe(400)
  })
})

describe('admin edit, shut-down and reactivation (real API)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=gateway-token' })
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }))
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('sends PATCH with the description and the CSRF header', async () => {
    await updateCommunityDescription('retro', { description: 'Back again.' })
    const [url, init] = fetchMock.mock.calls[0]!
    expect([url, init?.method]).toEqual(['/api/communities/retro', 'PATCH'])
    expect(JSON.parse(init?.body as string)).toEqual({ description: 'Back again.' })
    expect(new Headers(init?.headers).get('X-XSRF-TOKEN')).toBe('gateway-token')
  })

  it('shuts down with DELETE and reactivates with POST', async () => {
    await deactivateCommunity('food')
    await reactivateCommunity('food')
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['/api/communities/food', 'DELETE'],
      ['/api/communities/food/reactivate', 'POST'],
    ])
  })
})
