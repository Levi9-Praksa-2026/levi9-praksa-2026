import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MeResponse } from '@/shared/api/contracts/auth'
import { queryKeys } from '@/shared/api/queryKeys'
import { PostVote, type PostVoteProps } from './PostVote'

const post: PostVoteProps['post'] = { id: 7, authorId: 2, score: 12, myVote: null }

/** Renders with `me` already known, so useCurrentUser answers without a request. */
function render(me: MeResponse | null, overrides: Partial<PostVoteProps['post']> = {}) {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, me)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <PostVote post={{ ...post, ...overrides }} />
    </QueryClientProvider>,
  )
}

const ana: MeResponse = { id: 2, username: 'ana', roles: ['USER'] }
const marko: MeResponse = { id: 5, username: 'marko', roles: ['USER'] }

describe('PostVote', () => {
  it('sends a logged-out reader to Log in', () => {
    const html = render(null)
    expect(html).toContain('href="/oauth2/authorization/levddit" aria-label="Log in to upvote"')
    expect(html).not.toContain('<button')
  })

  it('turns the arrows off on your own post', () => {
    const html = render(ana)
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html).toContain("You can&#x27;t vote on your own post")
  })

  it('shows the vote the server knows as pressed, on someone else\'s post', () => {
    const html = render(marko, { myVote: 1 })
    expect(html).toContain('aria-label="Upvote" aria-pressed="true"')
    expect(html).toContain('aria-label="Downvote" aria-pressed="false"')
    expect(html).not.toContain('disabled=""')
    expect(html).toContain('aria-label="12 points"')
  })
})
