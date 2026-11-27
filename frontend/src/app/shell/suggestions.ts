import type { CommunityResponse } from '@/shared/api/contracts/communities'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { routes } from '@/shared/config/routes'

/** One row of the listbox, in the order it is shown: posts, then communities, then the explore link. */
export type Suggestion =
  | { kind: 'post'; id: string; post: PostResponse }
  | { kind: 'community'; id: string; community: CommunityResponse }
  | { kind: 'explore'; id: string }

export interface SuggestionSection {
  label: string
  items: Suggestion[]
  /** The section's first row's index in the flat, keyboard-navigable list. */
  start: number
}

/** Groups the matches for the listbox: posts first, communities second, and a way out when there are none. */
export function buildSuggestionSections(
  posts: readonly PostResponse[],
  communities: readonly CommunityResponse[],
  idPrefix: string,
  showExplore: boolean,
): SuggestionSection[] {
  const sections: SuggestionSection[] = []
  let start = 0
  if (posts.length) {
    sections.push({
      label: 'Posts',
      start,
      items: posts.map(post => ({ kind: 'post', id: `${idPrefix}-post-${post.id}`, post })),
    })
    start += posts.length
  }
  if (communities.length) {
    sections.push({
      label: 'Communities',
      start,
      items: communities.map(community => ({ kind: 'community', id: `${idPrefix}-community-${community.name}`, community })),
    })
    start += communities.length
  }
  if (showExplore && posts.length === 0 && communities.length === 0) {
    sections.push({ label: 'Explore', start, items: [{ kind: 'explore', id: `${idPrefix}-explore` }] })
  }
  return sections
}

export function suggestionTarget(suggestion: Suggestion): string {
  switch (suggestion.kind) {
    case 'post': return routes.post(suggestion.post.id)
    case 'community': return routes.community(suggestion.community.name)
    case 'explore': return routes.communities
  }
}

export function suggestionLabel(suggestion: Suggestion): string {
  switch (suggestion.kind) {
    case 'post': return suggestion.post.title
    case 'community': return `l/${suggestion.community.name}`
    case 'explore': return 'Explore all posts & communities'
  }
}
