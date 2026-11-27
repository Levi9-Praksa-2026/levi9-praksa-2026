import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PageResponse } from '@/shared/api/contracts/common'
import type { CommunityResponse } from '@/shared/api/contracts/communities'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { queryKeys } from '@/shared/api/queryKeys'
import { DiscoverPage } from './DiscoverPage'

const post: PostResponse = {
  id: 7,
  title: 'React tips',
  content: null,
  authorId: 2,
  authorUsername: 'ana',
  communityId: 3,
  communityName: 'frontend',
  score: 4,
  commentCount: 1,
  createdAt: '2026-11-25T09:00:00Z',
  updatedAt: null,
  images: [],
}
const community: CommunityResponse = { name: 'react', memberCount: 12 }

function page<T>(content: T[], totalElements = content.length): PageResponse<T> {
  return { content, page: 0, size: 5, totalElements, totalPages: Math.ceil(totalElements / 5) }
}

interface Seed {
  searchPosts?: PageResponse<PostResponse>
  searchCommunities?: PageResponse<CommunityResponse>
  posts?: PageResponse<PostResponse>
  communities?: PageResponse<CommunityResponse>
}

/** Renders with the lists already in the cache, so nothing is fetched. */
function render(url: string, seed: Seed = {}) {
  const client = new QueryClient()
  const params = new URL(url, 'http://localhost').searchParams
  const q = params.get('q') ?? ''
  const postsPage = Number(params.get('postsPage') ?? 0)
  const communitiesPage = Number(params.get('communitiesPage') ?? 0)
  // no-op: primes the same keys the page reads, without touching the network
  if (seed.searchPosts) client.setQueryData(queryKeys.posts.list({ q, page: postsPage, size: 5 }), seed.searchPosts)
  if (seed.searchCommunities) client.setQueryData(queryKeys.communities.list({ name: q, sort: 'new', page: communitiesPage, size: 10 }), seed.searchCommunities)
  if (seed.posts) client.setQueryData(queryKeys.posts.list({ page: postsPage, size: 5 }), seed.posts)
  if (seed.communities) client.setQueryData(queryKeys.communities.list({ sort: 'new', page: communitiesPage, size: 10 }), seed.communities)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <DiscoverPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const discoverySeed: Seed = { posts: page([post]), communities: page([community]) }
const searchSeed: Seed = {
  searchPosts: page([post]),
  searchCommunities: page([community]),
  ...discoverySeed,
}

describe('DiscoverPage', () => {
  it('shows the latest posts before the communities when there is no query', () => {
    const html = render('/communities', discoverySeed)
    expect(html).toContain('>Discover</h1>')
    expect(html.indexOf('id="discover-posts-title"')).toBeLessThan(html.indexOf('id="discover-communities-title"'))
    expect(html).toContain('React tips')
    expect(html).toContain('l/react')
  })

  it('shows matching posts before matching communities for a query', () => {
    const html = render('/communities?q=react', searchSeed)
    expect(html).toContain('Results for &quot;react&quot;')
    expect(html.indexOf('id="discover-posts-title"')).toBeLessThan(html.indexOf('id="discover-communities-title"'))
    expect(html).toContain('React tips')
    expect(html).toContain('l/react')
  })

  it('falls back to discovery when neither list has a match', () => {
    const html = render('/communities?q=none', {
      searchPosts: page([]),
      searchCommunities: page([]),
      ...discoverySeed,
    })
    expect(html).toContain('No results for &quot;none&quot;')
    expect(html).toContain('Explore posts and communities below.')
    expect(html).toContain('React tips')
    expect(html).toContain('l/react')
  })

  it('hides the communities section when view=posts', () => {
    const html = render('/communities?q=react&view=posts', searchSeed)
    expect(html).toContain('id="discover-posts-title"')
    expect(html).not.toContain('id="discover-communities-title"')
  })

  it('pages the results and writes the page count in the URL-driven view', () => {
    const html = render('/communities?q=react', {
      ...searchSeed,
      searchPosts: page([post], 11),
    })
    expect(html).toContain('Page 1 of 3 · 11 posts')
  })

  it('keeps each list on its own page', () => {
    const html = render('/communities?q=react&postsPage=1', {
      ...searchSeed,
      searchPosts: page([post], 11),
    })
    expect(html).toContain('Page 2 of 3 · 11 posts')
    expect(html).toContain('l/react')
    expect(html).not.toContain('No communities found.')
  })
})
