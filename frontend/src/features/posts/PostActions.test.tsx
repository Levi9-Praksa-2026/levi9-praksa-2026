import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { MeResponse } from '@/shared/api/contracts/auth'
import { queryKeys } from '@/shared/api/queryKeys'
import { PostActions } from './PostActions'

/** Renders the actions for a post by user 2, as `me`. */
function render(me: MeResponse | null) {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, me)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PostActions post={{ id: 7, authorId: 2 }} onEdit={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PostActions', () => {
  it('lets the author edit and remove', () => {
    const html = render({ id: 2, username: 'ana', roles: ['USER'] })
    expect(html).toContain('Edit')
    expect(html).toContain('Remove')
  })

  it('lets an admin remove but not edit someone else\'s post', () => {
    const html = render({ id: 9, username: 'admin', roles: ['USER', 'ADMIN'] })
    expect(html).not.toContain('Edit')
    expect(html).toContain('Remove')
  })

  it('shows nothing to another user or when logged out', () => {
    expect(render({ id: 5, username: 'marko', roles: ['USER'] })).toBe('')
    expect(render(null)).toBe('')
  })
})
