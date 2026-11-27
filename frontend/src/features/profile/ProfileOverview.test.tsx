import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ProfileOverviewResponse } from '@/shared/api/contracts/profile'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { queryKeys } from '@/shared/api/queryKeys'
import { ProfileOverview } from './ProfileOverview'

const profile: ProfileOverviewResponse = {
  id: 1,
  username: 'demo_user',
  firstName: 'Demo',
  lastName: 'User',
}
const post: PostResponse = {
  id: 7,
  title: 'How do you test accessibility?',
  content: 'Some content',
  authorId: 1,
  authorUsername: 'demo_user',
  communityId: 3,
  communityName: 'frontend',
  score: 21,
  commentCount: 3,
  createdAt: '2026-11-24T12:00:00Z',
  updatedAt: null,
  images: [],
}

/** Renders with the posts already in the cache, so nothing is fetched. */
function render(posts?: PostResponse[], fail = false) {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, null)
  if (posts) client.setQueryData(queryKeys.posts.byAuthor(profile.id, 5), posts)
  if (fail) client.getQueryCache().find({ queryKey: queryKeys.posts.byAuthor(profile.id, 5) })
    ?.setState({ status: 'error', error: new Error('failed'), fetchStatus: 'idle' })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfileOverview profile={profile} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProfileOverview', () => {
  it('shows the name and the user’s posts as cards', () => {
    const html = render([post])
    expect(html).toContain('Demo User')
    expect(html).toContain('u/demo_user')
    expect(html).toContain('aria-label="Edit name"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('aria-label="Your posts"')
    expect(html).toContain('href="/posts/7"')
    expect(html).toContain('l/frontend')
    expect(html).not.toContain('My communities')
  })

  it('has skeletons while the posts load', () => {
    expect(render()).toContain('aria-label="Loading posts"')
  })

  it('has an empty state when the user has not posted', () => {
    expect(render([])).toContain('written a post yet.')
  })

  it('keeps the profile and offers a retry when only the posts fail', () => {
    const html = render([], true)
    expect(html).toContain('Demo User')
    expect(html).toContain('Couldn&#x27;t load your posts')
    expect(html).toContain('Try again')
  })
})
