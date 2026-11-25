import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ProfileOverviewResponse } from '@/shared/api/contracts/profile'
import { ProfileOverview } from './ProfileOverview'

const render = (profile: ProfileOverviewResponse) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileOverview profile={profile} />
    </QueryClientProvider>,
  )

const profile: ProfileOverviewResponse = {
  username: 'demo_user',
  firstName: 'Demo',
  lastName: 'User',
  recentPosts: [{ id: 1, title: 'How do you test accessibility?', communityName: 'frontend', createdAt: '2026-11-24T12:00:00Z', score: 21, commentCount: 3 }],
}

describe('ProfileOverview', () => {
  it('shows the name and recent posts as plain rows, with no communities list', () => {
    const html = render(profile)
    expect(html).toContain('Demo User')
    expect(html).toContain('u/demo_user')
    expect(html).toContain('aria-label="Edit name"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('How do you test accessibility?')
    expect(html).toContain('21 points')
    expect(html).not.toContain('My communities')
    expect(html).not.toContain('/l/frontend')
  })

  it('has an empty state when the user has not posted', () => {
    const html = render({ username: 'demo_user', firstName: 'Demo', lastName: 'User', recentPosts: [] })
    expect(html).toContain('written a post yet.')
  })
})
