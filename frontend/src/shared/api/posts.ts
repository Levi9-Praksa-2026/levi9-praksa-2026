import type { PageParams, PageResponse, VoteValue } from './contracts/common'
import type {
  CommentRequest,
  CommentResponse,
  CreatePostRequest,
  PostListParams,
  PostResponse,
  TopPeriod,
  UpdatePostRequest,
} from './contracts/posts'
import { ApiError } from './errors'
import { http } from './http'
import { db, voteKey, type CommentRow, type PostRow, type UserRow } from './mock/db'
import { invalid, notBlank, optionalUser, requireUser } from './mock/guards'
import { handle, newestFirst } from './mock/server'

/*
  post-service, /api/posts/** and /api/comments/**. The reads (`listPosts`, `getPost`, `listComments`), creating,
  editing and removing a post are real requests. Post votes have no endpoint yet, so `votePost` and `unvotePost` send nothing.
  Everything else is still mocked: it
  answers from the in-memory data with the service's rules (docs/data-model.md, the endpoints doc).
  Replace each body with a request when the backend is up; the signatures stay.
*/

// The mocked comments' length limit, as post-service's PostLimits.CONTENT_MAX.
const CONTENT_MAX = 40_000

function livePost(id: number): PostRow {
  const post = db.posts.find(p => p.id === id && !p.removedAt)
  if (!post) throw new ApiError({ status: 404, title: 'Not Found', detail: `Post not found: ${id}` })
  return post
}

function liveComment(id: number): CommentRow {
  const comment = db.comments.find(c => c.id === id && !c.removedAt)
  if (!comment) throw new ApiError({ status: 404, title: 'Not Found', detail: `Comment not found: ${id}` })
  return comment
}

/** Posting and commenting need membership in the community (post-service asks community-service). */
function requireMember(user: UserRow, communityId: number): void {
  const community = db.communities.find(c => c.id === communityId && c.isActive)
  if (!community) throw new ApiError({ status: 404, title: 'Not Found', detail: `Community not found: ${communityId}` })
  if (!db.members.some(m => m.communityId === communityId && m.userId === user.id)) {
    throw new ApiError({ status: 403, title: 'Forbidden', detail: 'Join the community first' })
  }
}

function requireAuthor(user: UserRow, authorId: number): void {
  if (user.id !== authorId) throw new ApiError({ status: 403, title: 'Forbidden', detail: 'Only the author can do this' })
}

function requireAuthorOrAdmin(user: UserRow, authorId: number): void {
  if (user.id !== authorId && user.role !== 'ADMIN') throw new ApiError({ status: 403, title: 'Forbidden', detail: 'Only the author or an admin can do this' })
}

function checkVote(value: VoteValue): void {
  if (value !== 1 && value !== -1) throw invalid('value', 'must be 1 or -1')
}

/** Casts or changes a vote and moves the cached score by new minus old, like the service. */
function castVote(votes: Map<string, VoteValue>, target: { id: number; score: number }, userId: number, value: VoteValue | null): void {
  const key = voteKey(target.id, userId)
  const old = votes.get(key) ?? 0
  if (value === null) votes.delete(key)
  else votes.set(key, value)
  target.score += (value ?? 0) - old
}

function toPost(p: PostRow): PostResponse {
  const me = optionalUser()
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    authorId: p.authorId,
    authorUsername: p.authorUsername,
    communityId: p.communityId,
    communityName: db.communities.find(c => c.id === p.communityId)?.name ?? null,
    score: p.score,
    commentCount: p.commentCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    images: p.imageUrls.map((url, index) => ({ id: index + 1, url })),
    myVote: me ? (db.postVotes.get(voteKey(p.id, me.id)) ?? null) : null,
  }
}

function toComment(c: CommentRow): CommentResponse {
  const me = optionalUser()
  return {
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    authorUsername: c.authorUsername,
    content: c.content,
    score: c.score,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    myVote: me ? (db.commentVotes.get(voteKey(c.id, me.id)) ?? null) : null,
  }
}

const now = () => new Date().toISOString()

// ---------------------------------------------------------------- posts

/** `GET /api/posts?communityId=&q=&authorId=&page=&size=`: latest first. `q` searches titles; `authorId` lists one user's posts. */
export function listPosts({ communityId, q, authorId, page, size }: PostListParams = {}): Promise<PageResponse<PostResponse>> {
  return http<PageResponse<PostResponse>>('/api/posts', { query: { communityId, q, authorId, page, size } })
}

/** `GET /api/posts/top?period=ALL|WEEK`: the 10 highest scores; WEEK only counts posts created in the last 7 days. */
export function getTopPosts(period: TopPeriod = 'ALL'): Promise<PostResponse[]> {
  return handle(() => {
    const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()
    return db.posts
      .filter(p => !p.removedAt && (period === 'ALL' || p.createdAt >= since))
      .sort((a, b) => b.score - a.score || newestFirst(a, b))
      .slice(0, 10)
      .map(toPost)
  })
}

/** `GET /api/posts/{id}`: 404 if it does not exist or was removed. */
export function getPost(id: number): Promise<PostResponse> {
  return http<PostResponse>(`/api/posts/${id}`)
}

/**
 * `POST /api/posts`: multipart, a JSON part named `post` and up to 3 `images` (JPEG or PNG, 5 MB each). Members of
 * the community only; 201 with the post. 403 `NOT_COMMUNITY_MEMBER`, 422 when the community is shut down or an image
 * is refused, 413 when a file is too large for the server to read.
 */
export function createPost(request: CreatePostRequest, images: readonly File[] = []): Promise<PostResponse> {
  const form = new FormData()
  // The JSON part needs its own content type, or post-service can't read it as the request object.
  form.append('post', new Blob([JSON.stringify(request)], { type: 'application/json' }))
  for (const image of images) form.append('images', image, image.name)
  return http<PostResponse>('/api/posts', { method: 'POST', body: form })
}

/**
 * `PATCH /api/posts/{id}`: a new title and content, the author only (an admin too is refused, 403). 404 if it
 * was removed meanwhile.
 */
export function updatePost(id: number, request: UpdatePostRequest): Promise<PostResponse> {
  return http<PostResponse>(`/api/posts/${id}`, { method: 'PATCH', body: request })
}

/**
 * `DELETE /api/posts/{id}`: the author or an admin; 204, also when it was already removed. Soft: the row stays,
 * the post disappears from every read.
 */
export function removePost(id: number): Promise<void> {
  return http<void>(`/api/posts/${id}`, { method: 'DELETE' })
}

/**
 * `PUT /api/posts/{id}/vote`: cast or change your vote; 422 on your own post. post-service has the vote
 * tables but no endpoint yet, so this sends nothing and a vote lasts until the page reloads.
 */
export function votePost(_id: number, _value: VoteValue): Promise<void> {
  return Promise.resolve()
}

/** `DELETE /api/posts/{id}/vote`: take your vote back. No endpoint yet, see `votePost`. */
export function unvotePost(_id: number): Promise<void> {
  return Promise.resolve()
}

// ---------------------------------------------------------------- comments

/** `GET /api/posts/{id}/comments?page=&size=`: newest first, flat. 404 if the post is gone. */
export function listComments(postId: number, { page, size }: PageParams = {}): Promise<PageResponse<CommentResponse>> {
  return http<PageResponse<CommentResponse>>(`/api/posts/${postId}/comments`, { query: { page, size } })
}

/** `POST /api/posts/{id}/comments`: members of the post's community only; 201 with the comment. */
export function createComment(postId: number, request: CommentRequest): Promise<CommentResponse> {
  return handle(() => {
    const me = requireUser()
    const content = notBlank('content', request.content, CONTENT_MAX)
    const post = livePost(postId)
    requireMember(me, post.communityId)
    const at = now()
    const row: CommentRow = {
      id: db.nextId.comment++,
      postId,
      authorId: me.id,
      authorUsername: me.username,
      content,
      score: 0,
      createdAt: at,
      updatedAt: at,
      removedAt: null,
      removedBy: null,
    }
    db.comments.push(row)
    post.commentCount += 1
    return toComment(row)
  })
}

/** `PATCH /api/comments/{id}`: the author only. 404 if removed. */
export function updateComment(id: number, request: CommentRequest): Promise<CommentResponse> {
  return handle(() => {
    const me = requireUser()
    const comment = liveComment(id)
    requireAuthor(me, comment.authorId)
    comment.content = notBlank('content', request.content, CONTENT_MAX)
    comment.updatedAt = now()
    return toComment(comment)
  })
}

/** `DELETE /api/comments/{id}`: the author or an admin. Soft, and the post's comment count drops. */
export function removeComment(id: number): Promise<void> {
  return handle(() => {
    const me = requireUser()
    const comment = liveComment(id)
    requireAuthorOrAdmin(me, comment.authorId)
    comment.removedAt = now()
    comment.removedBy = me.id
    const post = db.posts.find(p => p.id === comment.postId)
    if (post) post.commentCount -= 1
  })
}

/** `PUT /api/comments/{id}/vote`: 422 on your own comment. */
export function voteComment(id: number, value: VoteValue): Promise<void> {
  return handle(() => {
    const me = requireUser()
    checkVote(value)
    const comment = liveComment(id)
    if (comment.authorId === me.id) throw new ApiError({ status: 422, title: 'Unprocessable Entity', detail: 'You cannot vote on your own comment' })
    castVote(db.commentVotes, comment, me.id, value)
  })
}

/** `DELETE /api/comments/{id}/vote`: take your vote back. */
export function unvoteComment(id: number): Promise<void> {
  return handle(() => {
    const me = requireUser()
    castVote(db.commentVotes, liveComment(id), me.id, null)
  })
}
