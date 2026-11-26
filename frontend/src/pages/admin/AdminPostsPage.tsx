import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { adminApi, type ModerationPost } from '@/shared/api/admin'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'
import { AppLink } from '@/shared/ui/Link'
import { TextField } from '@/shared/ui/TextField'
import { Pagination } from '@/shared/ui/Pagination'
import { Notice } from '@/shared/ui/Notice'
import { Modal } from '@/shared/ui/Modal'
import { ConfirmAction } from './ui'
import { adminError } from './errors'

export function AdminPostsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const rawPage = Number(params.get('page') ?? 0)
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0
  const posts = useQuery({ queryKey: queryKeys.admin.postList(q, page), queryFn: () => adminApi.posts(q, page) })
  const [target, setTarget] = useState<ModerationPost | null>(null)
  const [review, setReview] = useState<ModerationPost | null>(null)
  const [message, setMessage] = useState('')
  const client = useQueryClient()
  const remove = useMutation({
    mutationFn: (post: ModerationPost) => adminApi.removePost(post.id),
    onSuccess: (_, post) => { setTarget(null); setMessage(`Post “${post.title}” removed.`); void client.invalidateQueries({ queryKey: queryKeys.admin.posts }) },
  })
  function setPage(page: number) {
    setParams(previous => { const next = new URLSearchParams(previous); if (page) next.set('page', String(page)); else next.delete('page'); return next })
  }
  return <section className="grid gap-5" aria-labelledby="admin-posts-title">
    <header><h1 id="admin-posts-title" className="text-h2">Post moderation</h1><p className="mt-1 text-small text-muted">Review conversations and remove posts that should no longer be visible.</p></header>
    {message && <Notice tone="info">{message}</Notice>}
    <form key={q} onSubmit={event => { event.preventDefault(); const q = String(new FormData(event.currentTarget).get('q') ?? '').trim(); setParams(q ? { q } : {}) }} className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-bg p-card-pad">
      <TextField label="Search post titles" name="q" defaultValue={q} maxLength={300} className="min-w-0 flex-1" placeholder="Search by title" />
      <Button type="submit" variant="secondary">Search</Button>
    </form>
    {posts.isPending ? <Notice tone="info">Loading posts…</Notice> : posts.isError ? <Notice tone="error">{adminError(posts.error)} <button type="button" className="cursor-pointer underline" onClick={() => void posts.refetch()}>Try again</button></Notice> : <>
      {!posts.data?.content.length ? <p className="rounded-lg border border-line bg-bg p-card-pad text-small text-muted">No posts found. Try a different search.</p> : <ul className="grid gap-4">
        {posts.data.content.map(post => <li key={post.id} className="grid gap-3 rounded-lg border border-line bg-bg p-card-pad">
          <div className="flex flex-wrap justify-between gap-2 text-label text-muted"><span>u/{post.authorUsername} · Community #{post.communityId}</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time></div>
          <h2 className="break-words text-h3">{post.title}</h2>
          <p className="line-clamp-3 whitespace-pre-wrap break-words text-small text-muted">{post.content}</p>
          <p className="text-label text-muted">{post.score} score · {post.commentCount} comments</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setReview(post)}>Review post</Button>
            <Button variant="secondary" onClick={() => { remove.reset(); setTarget(post) }}>Remove post</Button>
            <AppLink href={`${routes.adminUsers}?username=${encodeURIComponent(post.authorUsername)}`} className="inline-flex items-center px-3 text-small font-medium text-accent underline underline-offset-4">Moderate author</AppLink>
          </div>
        </li>)}
      </ul>}
      <Pagination page={page} totalPages={posts.data?.totalPages ?? 0} totalElements={posts.data?.totalElements} itemLabel="posts" onChange={setPage} />
      {page > 0 && !posts.data?.content.length && <Button variant="secondary" onClick={() => setPage(0)}>Back to first page</Button>}
    </>}
    {target && <ConfirmAction title="Remove this post?" label="Remove post" pending={remove.isPending} error={remove.error} onClose={() => setTarget(null)} onConfirm={() => remove.mutate(target)}>
      <p className="mb-3 break-words font-medium text-ink">{target.title}</p>
      <p>This removes the post and its images from public reads and search. The database record is kept. This action cannot be undone from the admin area.</p>
    </ConfirmAction>}
    {review && <PostReview post={review} onClose={() => setReview(null)} />}
  </section>
}

function PostReview({ post, onClose }: { post: ModerationPost; onClose: () => void }) {
  const [page, setPage] = useState(0)
  const comments = useQuery({ queryKey: queryKeys.admin.comments(post.id, page), queryFn: () => adminApi.comments(post.id, page) })
  return <Modal title="Review post" onClose={onClose}>
    <article className="grid gap-4">
      <p className="text-label text-muted">u/{post.authorUsername} · Community #{post.communityId}</p>
      <h3 className="break-words text-h3">{post.title}</h3>
      <p className="whitespace-pre-wrap break-words text-small">{post.content}</p>
      {post.images?.map(image => <img key={image.id} src={image.url} alt={`Attachment to ${post.title}`} className="h-auto w-full rounded-md" />)}
      <h3 className="border-t border-line pt-4 text-h3">Comments</h3>
      <Notice tone="info">Comment removal is not available yet. You can review comments and moderate their authors.</Notice>
      {comments.isPending ? <p role="status" className="text-small text-muted">Loading comments…</p> : comments.isError ? <Notice tone="error">{adminError(comments.error)} <button type="button" className="cursor-pointer underline" onClick={() => void comments.refetch()}>Try again</button></Notice> : <>
        {!comments.data?.content.length ? <p className="text-small text-muted">No comments on this page.</p> : <ul className="grid gap-3">{comments.data.content.map(comment => <li key={comment.id} className="grid gap-2 rounded-md border border-line p-3">
          <p className="text-label text-muted">u/{comment.authorUsername}</p>
          <p className="whitespace-pre-wrap break-words text-small">{comment.content}</p>
          <AppLink href={`${routes.adminUsers}?username=${encodeURIComponent(comment.authorUsername)}`} className="text-small font-medium text-accent underline underline-offset-4" onClick={onClose}>Moderate author</AppLink>
        </li>)}</ul>}
        <Pagination page={page} totalPages={comments.data?.totalPages ?? 0} onChange={setPage} />
      </>}
    </article>
  </Modal>
}
