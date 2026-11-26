import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { MeResponse } from '@/shared/api/contracts/auth'
import { queryKeys } from '@/shared/api/queryKeys'
import { SUBMIT_PATTERN } from '@/shared/config/routes'
import { SubmitPage } from './SubmitPage'

const community = { id: 3, name: 'backend', description: null, memberCount: 7, createdAt: '2026-11-20T10:00:00Z' }

/** Renders /l/backend/submit with `me` and the community already in the cache, so nothing is fetched. */
function render(me: MeResponse | null) {
  const client = new QueryClient()
  client.setQueryData(queryKeys.me, me)
  client.setQueryData(queryKeys.communities.detail('backend'), community)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/l/backend/submit']}>
        <Routes>
          <Route path={SUBMIT_PATTERN} element={<SubmitPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SubmitPage', () => {
  it('asks a logged-out reader to log in first', () => {
    const html = render(null)
    expect(html).toContain('Log in to post')
    expect(html).toContain('href="/oauth2/authorization/levddit"')
    expect(html).not.toContain('<form')
  })

  it('shows the form for the community in the address', () => {
    const html = render({ id: 2, username: 'ana', roles: ['USER'] })
    expect(html).toContain('Create a post')
    expect(html).toMatch(/in l\/(<!-- -->)?backend/)
    expect(html).toContain('maxLength="300"')
    expect(html).toContain('accept="image/jpeg,image/png"')
    expect(html).toContain('href="/l/backend"')
  })
})
