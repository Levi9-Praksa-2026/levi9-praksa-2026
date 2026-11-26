import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { db, mockSignInAs, resetMockDb } from './mock/db'
import { setMockLatency } from './mock/server'
import {
  createComment,
  createPost,
  getPost,
  getTopPosts,
  listComments,
  listPosts,
  removeComment,
  removePost,
  unvotePost,
  updatePost,
  voteComment,
  votePost,
} from './posts'

/** The status of the ApiError a call rejects with. */
async function statusOf(call: Promise<unknown>): Promise<number> {
  const error = await call.then(() => undefined, (e: unknown) => e)
  expect(error).toBeInstanceOf(ApiError)
  return (error as ApiError).status
}

beforeEach(() => {
  setMockLatency(0)
  resetMockDb()
})

describe('post reads (real API)', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const examplePage = { content: [], page: 1, size: 5, totalElements: 6, totalPages: 2 }

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify(examplePage), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('asks for the main page with no filters, and returns the page as the backend gives it', async () => {
    expect(await listPosts()).toEqual(examplePage)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/posts')
  })

  it('sends the community, search and page it is given', async () => {
    await listPosts({ communityId: 3, q: 'tailwind', page: 1, size: 5 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/posts?communityId=3&q=tailwind&page=1&size=5')
  })

  it('asks for one post by id', async () => {
    await getPost(42)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/posts/42')
  })

  it('turns a 404 for a missing or removed post into an ApiError', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status: 404, title: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/problem+json' },
    }))
    expect(await statusOf(getPost(18))).toBe(404)
  })

  it('edits a post with a PATCH of both fields, with the CSRF header', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=gateway-token' })
    await updatePost(42, { title: 'New title', content: null })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/posts/42')
    expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ title: 'New title', content: null }) })
    expect(new Headers(init?.headers).get('X-XSRF-TOKEN')).toBe('gateway-token')
  })

  it('removes a post with a DELETE and takes the 204 as done', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }))
    await expect(removePost(42)).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/posts/42')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })

  it('asks for a page of a post\'s comments', async () => {
    await listComments(42, { page: 1, size: 10 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/posts/42/comments?page=1&size=10')
  })
})

/** A post as the mock holds it, for the mocked writes below (reads are real requests now). */
const stored = (id: number) => db.posts.find(p => p.id === id)!

describe('top posts (mocked)', () => {
  it('keeps the top 10, and WEEK only counts the last 7 days', async () => {
    const all = await getTopPosts('ALL')
    expect(all).toHaveLength(10)
    expect(all[0]!.title).toBe('What we learned moving to Java 25')
    const week = await getTopPosts('WEEK')
    expect(week.some(p => p.title === 'What we learned moving to Java 25')).toBe(false)
  })
})

describe('writing posts', () => {
  it('lets a member post, and refuses a non-member with 403', async () => {
    const backend = db.communities.find(c => c.name === 'backend')!
    const post = await createPost({ title: '  New one  ', content: 'Body', communityId: backend.id })
    expect(post).toMatchObject({ title: 'New one', authorUsername: 'demo_user', score: 0, commentCount: 0, myVote: null })
    const devops = db.communities.find(c => c.name === 'devops')!
    expect(await statusOf(createPost({ title: 'x', content: 'y', communityId: devops.id }))).toBe(403)
  })

  it('needs a login, a title and at most 3 images', async () => {
    const backend = db.communities.find(c => c.name === 'backend')!
    const image = new File(['x'], 'a.png')
    expect(await statusOf(createPost({ title: ' ', content: 'y', communityId: backend.id }))).toBe(400)
    expect(await statusOf(createPost({ title: 'x', content: 'y', communityId: backend.id }, [image, image, image, image]))).toBe(400)
    mockSignInAs(null)
    expect(await statusOf(createPost({ title: 'x', content: 'y', communityId: backend.id }))).toBe(401)
  })
})

describe('votes', () => {
  it('sends nothing for a post vote while post-service has no vote endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    try {
      await votePost(1, -1)
      await unvotePost(1)
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('refuses a vote on your own comment with 422', async () => {
    const mine = await createComment(1, { content: 'Mine' })
    expect(await statusOf(voteComment(mine.id, 1))).toBe(422)
  })
})

describe('comments', () => {
  it('keeps the post comment count in step', async () => {
    const before = stored(1).commentCount
    const comment = await createComment(1, { content: 'Hello' })
    expect(stored(1).commentCount).toBe(before + 1)
    await removeComment(comment.id)
    expect(stored(1).commentCount).toBe(before)
  })

  it('needs membership in the post community', async () => {
    expect(await statusOf(createComment(7, { content: 'devops is not joined' }))).toBe(403)
  })
})

it('hands back copies, so editing a response never edits the mock data', async () => {
  const [post] = await getTopPosts('ALL')
  post!.title = 'changed on the client'
  expect(stored(post!.id).title).not.toBe('changed on the client')
})
