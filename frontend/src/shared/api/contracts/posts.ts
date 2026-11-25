import type { Instant, PageParams, VoteValue } from './common'

/* post-service, /api/posts/** and /api/comments/**. Removed posts and comments never come back from a
   read (404 for one, left out of lists). Comments are flat: no replies to comments. */

/** One image of a post: `PostImageDTO.java`. */
export interface PostImage {
  id: number
  /** Relative, `/api/posts/{postId}/images/{id}`: post-service reads the file from the private bucket. Use as `<img src>`. */
  url: string
}

/** `PostDTO.java` */
export interface PostResponse {
  id: number
  title: string
  /** A post may be only a title. */
  content: string | null
  authorId: number
  /** Copied when the post was written; usernames never change. */
  authorUsername: string
  communityId: number
  /** Copied when the post was written; community names never change. Null on posts older than the copy. */
  communityName: string | null
  /** Upvotes minus downvotes. */
  score: number
  commentCount: number
  createdAt: Instant
  /** Null until the author edits the post. */
  updatedAt: Instant | null
  /** Up to 3, in upload order; empty for a post without images. */
  images: PostImage[]
  /** Contract gap: the caller's own vote, null when none or logged out. Not sent yet, so absent. */
  myVote?: VoteValue | null
}

/** `CommentDTO.java` */
export interface CommentResponse {
  id: number
  postId: number
  authorId: number
  authorUsername: string
  content: string
  score: number
  createdAt: Instant
  /** Contract gap: comments are editable, so the "edited" marker needs this. Not sent yet. */
  updatedAt?: Instant | null
  /** Contract gap: the caller's own vote, null when none or logged out. Not sent yet. */
  myVote?: VoteValue | null
}

/** `GET /api/posts?communityId=&q=&page=&size=`: latest first. Without filters, the main page. */
export interface PostListParams extends PageParams {
  communityId?: number
  /** Searches titles (contains, any case), up to 300 characters. */
  q?: string
}

/** `GET /api/posts/top?period=`: the top 10 by score. WEEK: only posts created in the last 7 days. */
export type TopPeriod = 'ALL' | 'WEEK'

/** The JSON part of `POST /api/posts` (multipart: this plus up to 3 images). Members only. */
export interface CreatePostRequest {
  title: string
  content: string
  communityId: number
}

/** `PATCH /api/posts/{id}`: the author only. */
export interface UpdatePostRequest {
  title?: string
  content?: string
}

/** `POST /api/posts/{id}/comments` and `PATCH /api/comments/{id}` */
export interface CommentRequest {
  content: string
}
