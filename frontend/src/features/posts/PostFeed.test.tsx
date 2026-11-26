import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PageResponse } from '@/shared/api/contracts/common'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { queryKeys } from '@/shared/api/queryKeys'
import { PostFeed } from './PostFeed'

const post: PostResponse = {
  id: 1,
  title: 'First post',
  content: null,
  authorId: 2,
  authorUsername: 'ana',
  communityId: 3,
  communityName: 'backend',
  score: 0,
  commentCount: 0,
  createdAt: '2026-11-25T09:00:00Z',
  updatedAt: null,
  images: [],
}

/** Renders with the first page already in the cache, so nothing is fetched. */
function render(page: PageResponse<PostResponse> | undefined, url = '/') {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, null)
  if (page) client.setQueryData(queryKeys.posts.list({ communityId: undefined, page: 0, size: 20 }), page)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <PostFeed label="Latest posts" emptyText="Nothing here." />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PostFeed', () => {
  it('shows skeletons while the first page loads', () => {
    expect(render(undefined)).toContain('aria-label="Loading posts"')
  })

  it('says so when there are no posts', () => {
    expect(render({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })).toContain('Nothing here.')
  })

  it('lists the cards and pages through them', () => {
    const html = render({ content: [post], page: 0, size: 20, totalElements: 21, totalPages: 2 })
    expect(html).toContain('<ul aria-label="Latest posts"')
    expect(html).toContain('First post')
    expect(html).toContain('Page 1 of 2 · 21 posts')
  })
})
