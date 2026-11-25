import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { mockSignInAs, resetMockDb } from './mock/db'
import { setMockLatency } from './mock/server'
import {
  createCommunity,
  deactivateCommunity,
  getCommunity,
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

describe('reading communities', () => {
  it('finds a community in any case, and 404s a shut-down one', async () => {
    expect((await getCommunity('FrontEnd')).name).toBe('frontend')
    const error = await errorOf(getCommunity('retro'))
    expect(error.status).toBe(404)
    expect(error.errorType).toBe('COMMUNITY_NOT_FOUND')
  })
})

describe('membership', () => {
  it('joins and leaves, both harmless when repeated', async () => {
    const before = await getCommunity('devops')
    expect(before.joined).toBe(false)
    await joinCommunity('devops')
    await joinCommunity('devops')
    const joined = await getCommunity('devops')
    expect(joined).toMatchObject({ joined: true, memberCount: before.memberCount + 1 })
    await leaveCommunity('devops')
    await leaveCommunity('devops')
    expect(await getCommunity('devops')).toMatchObject({ joined: false, memberCount: before.memberCount })
  })

  it('shows joined as false when logged out', async () => {
    mockSignInAs(null)
    expect((await getCommunity('frontend')).joined).toBe(false)
  })
})

describe('admin', () => {
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

  it('shuts down, reactivates and edits the description', async () => {
    mockSignInAs('admin')
    await deactivateCommunity('food')
    expect((await errorOf(getCommunity('food'))).status).toBe(404)
    await reactivateCommunity('retro')
    await updateCommunityDescription('retro', { description: 'Back again.' })
    expect((await getCommunity('retro')).description).toBe('Back again.')
  })
})
