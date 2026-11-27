import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { PostCard } from './PostCard'

const post: PostResponse = {
  id: 7,
  title: 'Spring Boot 4 upgrade notes',
  content: 'What broke for us.',
  authorId: 2,
  authorUsername: 'ana',
  communityId: 3,
  communityName: 'backend',
  score: 12,
  commentCount: 1,
  createdAt: '2026-11-25T09:00:00Z',
  updatedAt: null,
  images: [],
}

function render(overrides: Partial<PostResponse> = {}, hideCommunity = false) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PostCard post={{ ...post, ...overrides }} hideCommunity={hideCommunity} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PostCard', () => {
  it('shows where, who, the title, the preview and the counts', () => {
    const html = render()
    expect(html).toContain('href="/l/backend"')
    expect(html).toContain('u/ana')
    expect(html).toContain('Spring Boot 4 upgrade notes')
    expect(html).toContain('What broke for us.')
    expect(html).toContain('aria-label="12 points"')
    expect(html).toContain('1 comment<')
    expect(html).toContain('dateTime="2026-11-25T09:00:00Z"')
    expect(html).not.toContain('(edited)')
  })

  it('links the title to the post, and the count to its comments', () => {
    const html = render()
    expect(html).toContain('href="/posts/7" data-discover="true">Spring Boot 4 upgrade notes</a>')
    expect(html).toContain('href="/posts/7#comments"')
  })

  it('links the post author to their public profile', () => {
    expect(render()).toContain('href="/u/ana"')
    expect(render({ authorUsername: '' })).not.toContain('href="/u/')
    expect(render({ authorUsername: '' })).toContain('[deleted]')
  })

  it('names the article by its title', () => {
    expect(render()).toMatch(/<article aria-labelledby="post-7-title".*<h2 id="post-7-title"/)
  })

  it('leaves the community out inside a community, and when an older post has no name', () => {
    expect(render({}, true)).not.toContain('l/backend')
    expect(render({ communityName: null })).not.toContain('href="/l/')
  })

  it('has no preview for a title-only post, and marks an edited one', () => {
    const html = render({ content: null, updatedAt: '2026-11-25T10:00:00Z' })
    expect(html).not.toContain('line-clamp-3')
    expect(html).toContain('(edited)')
  })

  it('shows several images as a carousel: one at a time, numbered, with a dot each', () => {
    const images = [1, 2, 3].map(id => ({ id, url: `/api/posts/7/images/${id}` }))
    const html = render({ images })
    expect(html).toContain('aria-roledescription="carousel"')
    expect(html).toContain('src="/api/posts/7/images/2"')
    expect(html).toContain('alt="Attachment 2 of 3"')
    expect(html.match(/aria-label="Show image \d of 3"/g)).toHaveLength(3)
    expect(html).toContain('aria-label="Show image 1 of 3" aria-current="true"')
    // On the first image there is nowhere to go back to.
    expect(html).not.toContain('aria-label="Previous image"')
    expect(html).toContain('aria-label="Next image"')
  })

  it('keeps a single image as it is, with no carousel', () => {
    const html = render({ images: [{ id: 1, url: '/api/posts/7/images/1' }] })
    expect(html).not.toContain('carousel')
    expect(html).toContain('alt="Attached to the post"')
  })
})
