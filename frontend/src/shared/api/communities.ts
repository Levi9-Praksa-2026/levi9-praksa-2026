import type { PageResponse } from './contracts/common'
import {
  COMMUNITY_NAME_PATTERN,
  type CommunityDetailResponse,
  type CommunityListParams,
  type CommunityMembershipResponse,
  type CommunityResponse,
  type CreateCommunityRequest,
  type UpdateCommunityRequest,
} from './contracts/communities'
import { ApiError } from './errors'
import { http } from './http'
import { db, type CommunityRow } from './mock/db'
import { invalid, optionalUser, requireAdmin } from './mock/guards'
import { handle } from './mock/server'

/*
  community-service, /api/communities/**. Everything the browser uses is a real request; only creating
  a community is still mocked from the in-memory data with the service's rules and status codes.
  Its signature stays.
*/

const memberCount = (c: CommunityRow) => db.members.filter(m => m.communityId === c.id).length

function toDetail(c: CommunityRow): CommunityDetailResponse {
  const me = optionalUser()
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    memberCount: memberCount(c),
    createdAt: c.createdAt,
    joined: !!me && db.members.some(m => m.communityId === c.id && m.userId === me.id),
  }
}

/**
 * `GET /api/communities?sort=&name=&inactive=&page=&size=`: active communities, newest first by
 * default. The backend's admin handler is selected by the presence of `inactive`, so the parameter
 * is left out entirely for the public list (`inactive=false` would still require ADMIN).
 */
export function listCommunities({
  sort = 'new',
  name,
  inactive,
  page,
  size,
}: CommunityListParams = {}): Promise<PageResponse<CommunityResponse>> {
  return http<PageResponse<CommunityResponse>>('/api/communities', {
    query: {
      sort,
      name,
      inactive: inactive === true ? true : undefined,
      page,
      size,
    },
  })
}

/** The path of one community. Names are plain (`COMMUNITY_NAME_PATTERN`); encoded anyway, so a typed URL can't escape it. */
const communityPath = (name: string) => `/api/communities/${encodeURIComponent(name)}`

/** `GET /api/communities/{name}`: found in any case; 404 if it does not exist or is shut down. */
export function getCommunity(name: string): Promise<CommunityDetailResponse> {
  return http<CommunityDetailResponse>(communityPath(name))
}

/** `PUT /api/communities/{name}/members/me`: join; 204. Joining twice is harmless. */
export function joinCommunity(name: string): Promise<void> {
  return http<void>(`${communityPath(name)}/members/me`, { method: 'PUT' })
}

/** `DELETE /api/communities/{name}/members/me`: leave. Leaving when not a member is harmless. */
export function leaveCommunity(name: string): Promise<void> {
  return http<void>(`${communityPath(name)}/members/me`, { method: 'DELETE' })
}

/** `GET /api/communities/{name}/members/me`: whether the caller has joined; 401 when logged out. */
export function getCommunityMembership(name: string): Promise<CommunityMembershipResponse> {
  return http<CommunityMembershipResponse>(`${communityPath(name)}/members/me`)
}

/** `POST /api/communities` (ADMIN): 201 with the new community; 409 if the name is taken, in any case. */
export function createCommunity(request: CreateCommunityRequest): Promise<CommunityDetailResponse> {
  return handle(() => {
    const admin = requireAdmin()
    const name = request.name?.trim() ?? ''
    if (!name) throw invalid('name', 'must not be blank')
    if (!COMMUNITY_NAME_PATTERN.test(name)) throw invalid('name', 'must be a plain community name')
    if ((request.description?.length ?? 0) > 2000) throw invalid('description', 'size must be between 0 and 2000')
    if (db.communities.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError({ status: 409, title: 'Conflict', detail: `Community name is already taken: ${name}`, errorType: 'COMMUNITY_NAME_TAKEN' })
    }
    const row: CommunityRow = {
      id: db.nextId.community++,
      name,
      description: request.description?.trim() || null,
      creatorId: admin.id,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    db.communities.push(row)
    return toDetail(row)
  })
}

/** `PATCH /api/communities/{name}` (ADMIN): the description only; the name never changes. */
export function updateCommunityDescription(name: string, request: UpdateCommunityRequest): Promise<void> {
  return http<void>(communityPath(name), { method: 'PATCH', body: request })
}

/** `DELETE /api/communities/{name}` (ADMIN): shut down; nothing is deleted. */
export function deactivateCommunity(name: string): Promise<void> {
  return http<void>(communityPath(name), { method: 'DELETE' })
}

/** `POST /api/communities/{name}/reactivate` (ADMIN): undo a shutdown. */
export function reactivateCommunity(name: string): Promise<void> {
  return http<void>(`${communityPath(name)}/reactivate`, { method: 'POST' })
}
