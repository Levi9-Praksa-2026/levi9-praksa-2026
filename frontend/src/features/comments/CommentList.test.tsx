import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PageResponse } from '@/shared/api/contracts/common'
import type { CommentResponse } from '@/shared/api/contracts/posts'
import { queryKeys } from '@/shared/api/queryKeys'
import { CommentList } from './CommentList'

const comment: CommentResponse = {
  id: 1,
  postId: 2,
  authorId: 5,
  authorUsername: 'marko',
  content: 'Works for us.\nThanks!',
  score: 3,
  createdAt: '2026-11-25T09:00:00Z',
}

/** Renders with the first page of comments already in the cache (or not), so nothing is fetched. */
function render(page?: PageResponse<CommentResponse>, commentCount = 0) {
  const client = new QueryClient()
  if (page) client.setQueryData(queryKeys.posts.comments(2, 0), page)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CommentList postId={2} postAuthorId={5} commentCount={commentCount} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CommentList', () => {
  it('is the #comments target, headed by the post\'s count while the first page loads', () => {
    const html = render(undefined, 4)
    expect(html).toContain('<section id="comments"')
    expect(html).toContain('4 comments')
    expect(html).toContain('aria-label="Loading comments"')
  })

  it('marks only the post author\'s comments as OP', () => {
    const other = { ...comment, id: 2, authorId: 6, authorUsername: 'ana' }
    const html = render({ content: [other], page: 0, size: 20, totalElements: 1, totalPages: 1 })
    expect(html).not.toContain('OP<')
  })

  it('says so when there are none', () => {
    expect(render({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })).toContain('No comments yet.')
  })

  it('shows each comment with its author, text and score, and pages through them', () => {
    const html = render({ content: [comment], page: 0, size: 20, totalElements: 21, totalPages: 2 })
    expect(html).toContain('aria-label="Comment by marko"')
    expect(html).toContain('OP<span class="sr-only"> (wrote the post)</span>')
    expect(html).toContain('Works for us.\nThanks!')
    expect(html).toContain('3 points')
    expect(html).toContain('Page 1 of 2 · 21 comments')
  })
})
