import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/queryKeys'
import { CommunityPage } from './CommunityPage'

vi.mock('@/features/posts/PostFeed', () => ({ PostFeed: () => <p>Community posts</p> }))

it('keeps inactive community details in the shutdown view for admins receiving 200', () => {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, { id: 2, username: 'admin', roles: ['ADMIN'] })
  client.setQueryData(queryKeys.communities.detail('retired'), {
    id: 3, name: 'retired', description: 'Archived description', memberCount: 7,
    createdAt: '2026-11-20T10:00:00Z', active: false,
  })
  const html = renderToStaticMarkup(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/l/retired']}><Routes>
      <Route path="/l/:name" element={<CommunityPage />} />
    </Routes></MemoryRouter>
  </QueryClientProvider>)
  expect(html).toContain('Shut down')
  expect(html).toContain('Reactivate')
  expect(html).not.toContain('Community posts')
  expect(html).not.toContain('Join community')
  client.clear()
})

it('does not render cached inactive details or posts after losing admin access', () => {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, null)
  client.setQueryData(queryKeys.communities.detail('retired'), {
    id: 3, name: 'retired', description: 'Archived description', memberCount: 7,
    createdAt: '2026-11-20T10:00:00Z', active: false,
  })
  const html = renderToStaticMarkup(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/l/retired']}><Routes>
      <Route path="/l/:name" element={<CommunityPage />} />
    </Routes></MemoryRouter>
  </QueryClientProvider>)
  expect(html).toContain('exist')
  expect(html).not.toContain('Archived description')
  expect(html).not.toContain('Reactivate')
  expect(html).not.toContain('Community posts')
  client.clear()
})
