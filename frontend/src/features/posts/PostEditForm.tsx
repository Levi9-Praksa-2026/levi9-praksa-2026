import { useId, useState, type FormEvent } from 'react'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { cn } from '@/shared/lib/cn'
import { Notice } from '@/shared/ui/Notice'
import { TextField } from '@/shared/ui/TextField'
import { useEditPost } from './hooks'
import { CONTENT_MAX, saveErrorMessage, TITLE_MAX } from './messages'

export interface PostEditFormProps {
  post: Pick<PostResponse, 'id' | 'title' | 'content'>
  /** Saved or cancelled: back to reading. */
  onDone: () => void
}

/** The author's edit of a post's title and text, in place of them. Images stay as they are. */
export function PostEditForm({ post, onDone }: PostEditFormProps) {
  const contentId = useId()
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const save = useEditPost(post.id)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (title.trim() === '') {
      setTitleError('Give the post a title.')
      return
    }
    setTitleError(null)
    // An emptied text box means "no text", which post-service stores as null.
    save.mutate({ title: title.trim(), content: content.trim() === '' ? null : content }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4" aria-label="Edit post">
      <TextField
        label="Title"
        value={title}
        maxLength={TITLE_MAX}
        onChange={event => setTitle(event.target.value)}
        error={titleError}
        // the form opens because the author asked to edit: start where they will type
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={contentId} className="text-small font-medium text-ink">Text <span className="font-normal text-muted">(optional)</span></label>
        <textarea
          id={contentId}
          value={content}
          maxLength={CONTENT_MAX}
          rows={8}
          onChange={event => setContent(event.target.value)}
          className="min-h-32 resize-y rounded-md border border-line-strong bg-bg px-4 py-3 text-body text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {save.error && <Notice tone="error">{saveErrorMessage(save.error)}</Notice>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={save.isPending}
          className="cursor-pointer rounded-btn px-4 py-2 text-small font-medium text-ink hover:bg-surface disabled:cursor-wait"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-btn bg-action px-4 py-2 text-small font-medium text-action-ink hover:opacity-90',
            'disabled:cursor-wait disabled:opacity-60',
          )}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
