import { describe, expect, it } from 'vitest'
import type { CommunityResponse } from '@/shared/api/contracts/communities'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { buildSuggestionSections, suggestionLabel, suggestionTarget } from './suggestions'

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

describe('buildSuggestionSections', () => {
  it('puts posts before communities and keeps a flat index across both', () => {
    const sections = buildSuggestionSections([post], [community], 'list', true)
    expect(sections.map(section => section.label)).toEqual(['Posts', 'Communities'])
    expect(sections.map(section => section.start)).toEqual([0, 1])
    expect(sections.flatMap(section => section.items).map(suggestionLabel)).toEqual(['React tips', 'l/react'])
  })

  it('offers exploration only when neither list has a match', () => {
    const empty = buildSuggestionSections([], [], 'list', true)
    expect(empty.map(section => section.label)).toEqual(['Explore'])
    expect(suggestionTarget(empty[0]!.items[0]!)).toBe('/communities')
    expect(buildSuggestionSections([post], [], 'list', true).map(section => section.label)).toEqual(['Posts'])
    expect(buildSuggestionSections([], [], 'list', false)).toEqual([])
  })

  it('links each kind to its page', () => {
    const [posts, communities] = buildSuggestionSections([post], [community], 'list', false)
    expect(suggestionTarget(posts!.items[0]!)).toBe('/posts/7')
    expect(suggestionTarget(communities!.items[0]!)).toBe('/l/react')
  })

  it('gives each option a distinct DOM id', () => {
    const sections = buildSuggestionSections([post], [community], 'list', false)
    const ids = sections.flatMap(section => section.items.map(item => item.id))
    expect(ids).toEqual(['list-post-7', 'list-community-react'])
  })
})
