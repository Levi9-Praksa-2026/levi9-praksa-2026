import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { mockSignInAs, resetMockDb } from './mock/db'
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
import { getCommunity } from './communities'

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

describe('post list (real API)', () => {
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
})

describe('reading posts', () => {
  it('gives the caller its own vote, and none when logged out', async () => {
    expect((await getPost(1)).myVote).toBe(1)
    mockSignInAs(null)
    expect((await getPost(1)).myVote).toBeNull()
  })

  it('returns 404 for a removed post', async () => {
    expect(await statusOf(getPost(18))).toBe(404)
  })

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
    const backend = await getCommunity('backend')
    const post = await createPost({ title: '  New one  ', content: 'Body', communityId: backend.id })
    expect(post).toMatchObject({ title: 'New one', authorUsername: 'demo_user', score: 0, commentCount: 0, myVote: null })
    const devops = await getCommunity('devops')
    expect(await statusOf(createPost({ title: 'x', content: 'y', communityId: devops.id }))).toBe(403)
  })

  it('needs a login, a title and at most 3 images', async () => {
    const backend = await getCommunity('backend')
    const image = new File(['x'], 'a.png')
    expect(await statusOf(createPost({ title: ' ', content: 'y', communityId: backend.id }))).toBe(400)
    expect(await statusOf(createPost({ title: 'x', content: 'y', communityId: backend.id }, [image, image, image, image]))).toBe(400)
    mockSignInAs(null)
    expect(await statusOf(createPost({ title: 'x', content: 'y', communityId: backend.id }))).toBe(401)
  })

  it('lets only the author edit, and the author or an admin remove', async () => {
    expect(await statusOf(updatePost(1, { title: 'Mine now' }))).toBe(403)
    const edited = await updatePost(3, { title: 'Edited' })
    expect(edited.title).toBe('Edited')
    expect(edited.updatedAt! >= edited.createdAt).toBe(true)
    expect(await statusOf(removePost(1))).toBe(403)
    mockSignInAs('admin')
    await removePost(1)
    expect(await statusOf(getPost(1))).toBe(404)
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
  it('lists newest first and 404s when the post is gone', async () => {
    const page = await listComments(1)
    const dates = page.content.map(c => c.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())
    expect(await statusOf(listComments(18))).toBe(404)
  })

  it('keeps the post comment count in step', async () => {
    const before = (await getPost(1)).commentCount
    const comment = await createComment(1, { content: 'Hello' })
    expect((await getPost(1)).commentCount).toBe(before + 1)
    await removeComment(comment.id)
    expect((await getPost(1)).commentCount).toBe(before)
  })

  it('needs membership in the post community', async () => {
    expect(await statusOf(createComment(7, { content: 'devops is not joined' }))).toBe(403)
  })
})

it('hands back copies, so editing a response never edits the mock data', async () => {
  const post = await getPost(1)
  post.title = 'changed on the client'
  expect((await getPost(1)).title).not.toBe('changed on the client')
})
