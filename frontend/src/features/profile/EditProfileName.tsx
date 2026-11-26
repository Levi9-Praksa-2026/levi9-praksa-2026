import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { NAME_MAX_LENGTH } from '@/shared/api/contracts/auth'
import { isApiError } from '@/shared/api/errors'
import { updateMyName } from '@/shared/api/profile'
import { queryKeys } from '@/shared/api/queryKeys'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/TextField'
import { checkName } from './validateName'

export interface EditProfileNameProps {
  username: string
  firstName: string
  lastName: string
}

interface FieldErrors {
  firstName?: string
  lastName?: string
}

/**
 * The profile's name and the pencil next to it. Editing uses the real PATCH /api/users/me; the profile query
 * is then refetched so the heading follows the saved account. The username never changes.
 */
export function EditProfileName({ username, firstName, lastName }: EditProfileNameProps) {
  const [editing, setEditing] = useState(false)
  const [first, setFirst] = useState(firstName)
  const [last, setLast] = useState(lastName)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const pencilRef = useRef<HTMLButtonElement>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const wasEditing = useRef(false)
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: () => updateMyName(first.trim(), last.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.overview })
      close()
    },
    onError: (error: unknown) => {
      const fieldErrors: FieldErrors = {}
      if (isApiError(error)) {
        for (const violation of error.errors) {
          if (violation.field === 'firstName') fieldErrors.firstName = violation.message
          if (violation.field === 'lastName') fieldErrors.lastName = violation.message
        }
      }
      setErrors(fieldErrors)
      if (!fieldErrors.firstName && !fieldErrors.lastName) {
        setMessage(isApiError(error) && error.status === 401 ? 'Log in to edit your name.' : "Couldn't save your name. Try again.")
      }
    },
  })

  // The pencil stays in the DOM while editing, so closing (Escape or Save) can return focus to it.
  useEffect(() => {
    if (editing) firstRef.current?.focus()
    else if (wasEditing.current) pencilRef.current?.focus()
    wasEditing.current = editing
  }, [editing])

  function open() {
    setFirst(firstName)
    setLast(lastName)
    setErrors({})
    setMessage(null)
    setEditing(true)
  }

  function close() {
    setEditing(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = { firstName: checkName(first, 'First name'), lastName: checkName(last, 'Last name') }
    setErrors(next)
    setMessage(null)
    if (next.firstName || next.lastName) return
    save.mutate()
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    close()
  }

  const displayName = `${firstName} ${lastName}`.trim() || username

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
            <TextField
              ref={firstRef}
              label="First name"
              value={first}
              onChange={event => setFirst(event.target.value)}
              onKeyDown={onKeyDown}
              error={errors.firstName}
              maxLength={NAME_MAX_LENGTH}
              disabled={save.isPending}
            />
            <TextField
              label="Last name"
              value={last}
              onChange={event => setLast(event.target.value)}
              onKeyDown={onKeyDown}
              error={errors.lastName}
              maxLength={NAME_MAX_LENGTH}
              disabled={save.isPending}
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" onKeyDown={onKeyDown} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
              <Button type="button" variant="secondary" onKeyDown={onKeyDown} onClick={close} disabled={save.isPending}>Cancel</Button>
            </div>
            <p role="status" className={cn('text-small font-medium text-accent', message ? 'sm:col-span-2' : 'sr-only')}>
              {message ?? ''}
            </p>
          </form>
        ) : (
          <>
            <h1 id="profile-title" className="text-h3">{displayName}</h1>
            <p className="mt-1 text-small text-muted">u/{username}</p>
          </>
        )}
      </div>
      <button
        ref={pencilRef}
        type="button"
        aria-label="Edit name"
        aria-expanded={editing}
        onClick={open}
        className={cn(
          'grid size-8 flex-none cursor-pointer place-items-center rounded-btn text-muted hover:bg-surface hover:text-ink',
          editing && 'hidden',
        )}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
