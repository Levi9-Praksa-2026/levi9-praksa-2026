import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { useCommunity } from '@/features/communities/hooks'
import { useCreatePost } from '@/features/posts/hooks'
import { ImagePicker } from '@/features/posts/ImagePicker'
import { CONTENT_MAX, createErrorMessage, isNotMember, TITLE_MAX } from '@/features/posts/messages'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import { joinCommunity } from '@/shared/api/communities'
import type { CommunityDetailResponse } from '@/shared/api/contracts/communities'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Notice } from '@/shared/ui/Notice'
import { TextArea } from '@/shared/ui/TextArea'
import { TextField } from '@/shared/ui/TextField'

const panel = 'rounded-lg border border-line bg-bg p-card-pad'

/** `/l/:name/submit`: a new post in that community. Logged out, it asks for a login first. */
export function SubmitPage() {
  const { name = '' } = useParams()
  const { user } = useCurrentUser()
  const { data: community, error, isPending } = useCommunity(name)

  if (user === null) {
    return (
      <div className={cn(panel, 'py-10 text-center')}>
        <h1 className="text-h3">Log in to post</h1>
        <p className="mt-2 text-small text-muted">Posting in l/{name} needs an account.</p>
        <a href={routes.login} className="mt-4 inline-block text-small font-medium text-accent underline underline-offset-2">Log in</a>
      </div>
    )
  }

  if (isPending || user === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading" className={cn(panel, 'grid gap-4')}>
        <span className="h-6 w-56 animate-pulse rounded-sm bg-surface" />
        <span className="h-12 w-full animate-pulse rounded-md bg-surface" />
        <span className="h-32 w-full animate-pulse rounded-md bg-surface" />
      </div>
    )
  }

  if (error || community?.active === false) {
    const missing = community?.active === false || (isApiError(error) && error.status === 404)
    return (
      <div className={cn(panel, 'py-10 text-center')}>
        <h1 className="text-h3">{missing ? `l/${name} doesn't exist` : `Couldn't load l/${name}`}</h1>
        <p className="mt-2 text-small text-muted">{missing ? 'It may have been shut down, or the link is mistyped.' : 'Check your connection and try again.'}</p>
      </div>
    )
  }

  return <SubmitForm community={community} />
}

function SubmitForm({ community }: { community: CommunityDetailResponse }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [titleError, setTitleError] = useState<string | null>(null)
  const create = useCreatePost()
  const join = useMutation({
    mutationFn: () => joinCommunity(community.name),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.communities.detail(community.name) }),
  })
  const busy = create.isPending || join.isPending

  function send() {
    create.mutate(
      // An empty text box means a title-only post, which post-service stores as null.
      { request: { title: title.trim(), content: content.trim() === '' ? null : content, communityId: community.id }, images },
      { onSuccess: post => navigate(routes.post(post.id)) },
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (title.trim() === '') {
      setTitleError('Give the post a title.')
      return
    }
    setTitleError(null)
    send()
  }

  /** Not a member yet: join, then post what is already typed, so nothing has to be entered again. */
  function joinAndPost() {
    join.mutate(undefined, { onSuccess: send })
  }

  return (
    <section aria-labelledby="submit-title" className={cn(panel, 'grid gap-5')}>
      <header className="grid gap-1">
        <h1 id="submit-title" className="text-h3">Create a post</h1>
        <Link to={routes.community(community.name)} className="flex w-fit items-center gap-1.5 text-small font-medium text-muted hover:text-accent">
          <CommunityAvatar name={community.name} className="size-5 text-[11px]" />
          in l/{community.name}
        </Link>
      </header>

      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField
          label="Title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={event => setTitle(event.target.value)}
          error={titleError}
          disabled={busy}
          // the page exists to write a post: start where the author types
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <TextArea
          label={<>Text <span className="font-normal text-muted">(optional)</span></>}
          value={content}
          maxLength={CONTENT_MAX}
          onChange={event => setContent(event.target.value)}
          disabled={busy}
        />
        <ImagePicker images={images} onChange={setImages} disabled={busy} />

        {create.error && isNotMember(create.error) && !join.isSuccess ? (
          <Notice tone="error">
            <p>Join l/{community.name} to post here.</p>
            <button
              type="button"
              onClick={joinAndPost}
              disabled={busy}
              className="mt-2 cursor-pointer rounded-btn bg-action px-3 py-1.5 text-small font-medium text-action-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {join.isPending ? 'Joining…' : `Join and post`}
            </button>
          </Notice>
        ) : create.error ? (
          <Notice tone="error">{createErrorMessage(create.error)}</Notice>
        ) : join.error ? (
          <Notice tone="error">Couldn't join l/{community.name}. Try again in a moment.</Notice>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to={routes.community(community.name)}
            className="rounded-btn px-4 py-2 text-small font-medium text-ink hover:bg-surface"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-btn bg-action px-4 py-2 text-small font-medium text-action-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {create.isPending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </section>
  )
}
