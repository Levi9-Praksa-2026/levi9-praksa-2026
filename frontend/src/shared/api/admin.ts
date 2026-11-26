import type { RegisterRequest } from './contracts/auth'
import type { UserProfileResponse } from './contracts/users'
import type { PageResponse } from './contracts/common'
import type { CommunityDetailResponse, CommunitySort, CreateCommunityRequest } from './contracts/communities'
import { http } from './http'

export interface AdminCreateUserRequest extends RegisterRequest {
  role?: 'USER' | 'ADMIN'
}

export interface AdminUpdateUserRequest {
  firstName: string
  lastName: string
  email: string
}

export interface AdminUser {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  role: 'USER' | 'ADMIN'
  banned: boolean
  deleted: boolean
  banReason: string | null
  bannedAt: string | null
  createdAt: string
}
export interface AdminUserFilters {
  role?: 'USER' | 'ADMIN'
  q?: string
  status?: 'active' | 'banned' | 'deleted'
  page?: number
  size?: number
}

export interface AdminCommunity {
  name: string
  memberCount: number
  active: boolean
}
export interface AdminCommunityFilters {
  name?: string
  status?: 'active' | 'inactive'
  sort?: CommunitySort
  page?: number
  size?: number
}

/** Actual post-service DTOs: do not depend on the public feed's mock-only fields. */
export interface ModerationPost {
  id: number
  title: string
  content: string
  authorUsername: string
  communityId: number
  score: number
  commentCount: number
  createdAt: string
  images: { id: number; url: string }[]
}
export interface ModerationComment {
  id: number
  postId: number
  authorUsername: string
  content: string
  createdAt: string
}

const communityPath = (name: string) => `/api/communities/${encodeURIComponent(name)}`
const banPath = (username: string) => `/api/admin/users/${encodeURIComponent(username)}/ban`

/** Admin writes use the gateway session and CSRF handling, never the mock session. */
export const adminApi = {
  updateUser: (username: string, body: AdminUpdateUserRequest) => http<UserProfileResponse>(`/api/admin/users/${encodeURIComponent(username)}`, { method: 'PATCH', body }),
  createUser: (body: AdminCreateUserRequest) => http<UserProfileResponse>('/api/admin/users', { method: 'POST', body }),
  users: (filters: AdminUserFilters) => http<PageResponse<AdminUser>>('/api/admin/users', { query: { ...filters } }),
  communities: ({ status, ...filters }: AdminCommunityFilters) => http<PageResponse<AdminCommunity>>('/api/communities', {
    query: { ...filters, inactive: status === 'active' ? 'false' : status === 'inactive' ? 'true' : 'all' },
  }),
  community: (name: string) => http<Omit<CommunityDetailResponse, 'joined'>>(communityPath(name)),
  createCommunity: (body: CreateCommunityRequest) => http<Omit<CommunityDetailResponse, 'joined'>>('/api/communities', { method: 'POST', body }),
  editCommunity: (name: string, description: string) => http<void>(communityPath(name), { method: 'PATCH', body: { description } }),
  deactivateCommunity: (name: string) => http<void>(communityPath(name), { method: 'DELETE' }),
  reactivateCommunity: (name: string) => http<void>(`${communityPath(name)}/reactivate`, { method: 'POST' }),
  banUser: (username: string, reason: string) => http<void>(banPath(username), { method: 'POST', body: { reason } }),
  unbanUser: (username: string) => http<void>(banPath(username), { method: 'DELETE' }),
  posts: (q: string, page: number) => http<PageResponse<ModerationPost>>('/api/posts', { query: { q: q || undefined, page, size: 10 } }),
  removePost: (id: number) => http<void>(`/api/posts/${id}`, { method: 'DELETE' }),
  comments: (id: number, page: number) => http<PageResponse<ModerationComment>>(`/api/posts/${id}/comments`, { query: { page, size: 10 } }),
}
