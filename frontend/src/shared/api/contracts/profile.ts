import type { Instant } from './common'

/*
  There is no profile overview endpoint yet. These are the fields the Profile page needs; the shape is a
  proposal, like the other "contract gap" fields. Until a service exposes it, identity comes from the real
  /api/users/me and recentPosts stays empty — no mock rows, and no "my communities" section.
*/

/** One of the caller's posts, in the plain-text list on the profile. No PostCard needed. */
export interface ProfilePostSummary {
  id: number
  title: string
  communityName: string
  createdAt: Instant
  score: number
  commentCount: number
}

/** `GET /api/profile/overview` (proposed): the logged-in user's profile. */
export interface ProfileOverviewResponse {
  username: string
  firstName: string
  lastName: string
  /** Newest first; capped by the service so the page stays a summary. */
  recentPosts: ProfilePostSummary[]
}
