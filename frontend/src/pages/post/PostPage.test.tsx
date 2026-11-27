import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { queryKeys } from '@/shared/api/queryKeys'
import { POST_PATTERN } from '@/shared/config/routes'
import { PostPage } from './PostPage'

const post: PostResponse = {
  id: 2,
  title: 'Release notes',
  content: 'Line one\nLine two, which a card would cut off after three lines.',
  authorId: 5,
  authorUsername: 'ana',
  communityId: 1,
  communityName: 'backend',
  score: 4,
  commentCount: 0,
  createdAt: '2026-11-25T09:00:00Z',
  updatedAt: null,
  images: [{ id: 1, url: '/api/posts/2/images/1' }],
}

/** Renders `url` with the post already in the cache (or not), so nothing is fetched. */
function render(url: string, cached?: PostResponse) {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, null)
  if (cached) client.setQueryData(queryKeys.posts.detail(cached.id), cached)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={POST_PATTERN} element={<PostPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PostPage', () => {
  it('shows the whole post, with the title as the page heading and the image at full size', () => {
    const html = render('/posts/2', post)
    expect(html).toContain('<h1 id="post-title"')
    expect(html).toContain('Release notes')
    expect(html).toContain('which a card would cut off')
    expect(html).not.toContain('line-clamp')
    expect(html).toContain('aria-label="Enlarge image"')
    expect(html).toContain('href="/l/backend"')
    expect(html).toContain('href="/u/ana"')
  })

  it('treats an id that cannot be a post as gone, without asking', () => {
    expect(render('/posts/abc')).toContain('This post is gone')
    expect(render('/posts/0')).toContain('This post is gone')
  })

  it('shows a skeleton while the post loads', () => {
    expect(render('/posts/3')).toContain('aria-label="Loading post"')
  })
})
