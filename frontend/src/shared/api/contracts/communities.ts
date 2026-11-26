import type { Instant, PageParams } from './common'

/* community-service, /api/communities/**. A community's name is its id in URLs: stored without the
   "l/" prefix (the UI adds it), never changes, and matches [A-Za-z0-9_-]{1,50}. */

export const COMMUNITY_NAME_PATTERN = /^[A-Za-z0-9_-]{1,50}$/

/** One community in a list: `CommunityResponse.java`. Deliberately small; the detail has the rest. */
export interface CommunityResponse {
  name: string
  memberCount: number
}

/** `GET /api/communities/{name}`: `CommunityDetailDTO.java`. Its `id` is what lists and creates posts. */
export interface CommunityDetailResponse {
  id: number
  name: string
  description: string | null
  memberCount: number
  createdAt: Instant
  /**
   * Contract gap: whether the caller is a member (Join or Leave, and whether they may post).
   * Proposed: present when logged in, false when logged out. Not sent yet, so absent.
   */
  joined?: boolean
}

/** `new`: newest first. `top`: most members. `hot` is not supported by the backend. */
export type CommunitySort = 'new' | 'top'

/** `GET /api/communities?sort=&name=&inactive=&page=&size=` */
export interface CommunityListParams extends PageParams {
  sort?: CommunitySort
  /** Filters by name (contains, any case; at most 50 characters). */
  name?: string
  /**
   * ADMIN only: list shut-down communities instead of active ones. The real backend selects its admin
   * handler by the *presence* of this parameter, so it must be omitted entirely when off.
   */
  inactive?: boolean
  /**
   * Mock-only contract gap: the sidebar's "my communities". community-service has no endpoint for
   * the caller's memberships, so this is ignored by the real request and the sidebar stays hidden.
   */
  member?: 'me'
}

/** `POST /api/communities` (ADMIN): `CreateCommunityRequest.java`. */
export interface CreateCommunityRequest {
  name: string
  /** Up to 2000 characters; may be empty. */
  description?: string | null
}

/** `PATCH /api/communities/{name}` (ADMIN): `UpdateCommunityRequest.java`. Only the description changes. */
export interface UpdateCommunityRequest {
  description: string
}
