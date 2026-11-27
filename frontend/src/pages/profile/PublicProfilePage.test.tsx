import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { PublicProfilePage } from './PublicProfilePage'

const query = vi.hoisted(() => ({
  result: {} as Record<string, unknown>,
  keys: [] as unknown[],
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: unknown }) => {
    query.keys.push(options.queryKey)
    return query.result
  },
}))

function render(username = 'ana') {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/u/${username}`]}>
      <Routes><Route path="/u/:username" element={<PublicProfilePage />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => { query.result = {}; query.keys = [] })

describe('PublicProfilePage', () => {
  it('shows the loaded public identity', () => {
    query.result = { data: { username: 'ana', firstName: 'Ana', lastName: 'Jovanovic', createdAt: '2026-01-01T00:00:00Z' } }
    const html = render()
    expect(html).toContain('Ana Jovanovic')
    expect(html).toContain('u/ana')
  })

  it('shows a loading state', () => {
    query.result = { isPending: true }
    expect(render()).toContain('aria-label="Loading profile"')
  })

  it('shows an unavailable message and home link for a missing user', () => {
    query.result = { error: new ApiError({ status: 404, title: 'Not Found' }) }
    const html = render()
    expect(html).toContain('This user is unavailable')
    expect(html).toContain('href="/"')
  })

  it('offers retry for a network error', () => {
    query.result = { error: new TypeError('Network error'), refetch: vi.fn() }
    const html = render()
    expect(html).toContain('Couldn&#x27;t load this profile')
    expect(html).toContain('Try again')
  })

  it('uses a separate query key for each user', () => {
    query.result = { isPending: true }
    render('Ana')
    render('marko')
    expect(query.keys).toEqual([['profile', 'public', 'ana'], ['profile', 'public', 'marko']])
  })
})
