import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { adminApi, type ModerationPost } from '@/shared/api/admin'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/TextField'
import { Pagination } from '@/shared/ui/Pagination'
import { Notice } from '@/shared/ui/Notice'
import { ConfirmAction } from './ui'
import { adminError } from './errors'

export function AdminPostsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const rawPage = Number(params.get('page') ?? 0)
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0
  const posts = useQuery({ queryKey: queryKeys.admin.postList(q, page), queryFn: () => adminApi.posts(q, page) })
  const [target, setTarget] = useState<ModerationPost | null>(null)
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
          <div className="flex items-center justify-between gap-2">
            <Button href={`${routes.adminUsers}?username=${encodeURIComponent(post.authorUsername)}`} variant="secondary" className="max-sm:px-2 max-sm:text-small">Moderate author</Button>
            <Button variant="danger-outline" className="max-sm:px-2 max-sm:text-small" onClick={() => { remove.reset(); setTarget(post) }}>Remove post</Button>
          </div>
        </li>)}
      </ul>}
      <Pagination page={page} totalPages={posts.data?.totalPages ?? 0} totalElements={posts.data?.totalElements} itemLabel="posts" onChange={setPage} />
      {page > 0 && !posts.data?.content.length && <Button variant="secondary" onClick={() => setPage(0)}>Back to first page</Button>}
    </>}
    {target && <ConfirmAction destructive title="Remove this post?" label="Remove post" pending={remove.isPending} error={remove.error} onClose={() => setTarget(null)} onConfirm={() => remove.mutate(target)}>
      <p className="mb-3 break-words font-medium text-ink">{target.title}</p>
      <p>This removes the post and its images from public reads and search. The database record is kept. This action cannot be undone from the admin area.</p>
    </ConfirmAction>}
  </section>
}
