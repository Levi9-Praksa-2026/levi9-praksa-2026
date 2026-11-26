import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { adminApi } from '@/shared/api/admin'
import { TextField } from '@/shared/ui/TextField'
import { TextArea } from '@/shared/ui/TextArea'
import { Select } from '@/shared/ui/Select'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Notice'
import { ConfirmAction } from './ui'

const BAN_REASONS = [
  { label: 'Spam', reason: 'Repeated spam or unsolicited advertising.' },
  { label: 'Harassment', reason: 'Harassment or bullying of other users.' },
  { label: 'Hate speech', reason: 'Hate speech or discriminatory content.' },
  { label: 'Inappropriate content', reason: 'Posting inappropriate or harmful content.' },
  { label: 'Impersonation', reason: 'Impersonating another person or organization.' },
] as const

export function AdminUsersPage() {
  const [params] = useSearchParams()
  const [action, setAction] = useState('ban')
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState<{ username: string; reason: string; action: string } | null>(null)
  const [message, setMessage] = useState('')
  const [validationError, setValidationError] = useState('')
  const mutation = useMutation({
    mutationFn: (values: { username: string; reason: string; action: string }) => values.action === 'ban' ? adminApi.banUser(values.username, values.reason) : adminApi.unbanUser(values.username),
    onSuccess: (_, values) => { setPending(null); setMessage(`u/${values.username} ${values.action === 'ban' ? 'banned' : 'unbanned'}.`) },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const username = String(data.get('username') ?? '').trim()
    const reason = String(data.get('reason') ?? '').trim()
    if (!username || (action === 'ban' && !reason)) { setValidationError('Enter a username and a nonblank reason for the ban.'); return }
    setValidationError('')
    mutation.reset()
    setMessage('')
    setPending({ username, reason, action })
  }
  return <section aria-labelledby="admin-users-title" className="grid gap-5">
    <header><h1 id="admin-users-title" className="text-h2">User moderation</h1><p className="mt-1 text-small text-muted">Ban or restore access for a specific user.</p></header>
    {validationError && <Notice tone="error">{validationError}</Notice>}
    {message && <Notice tone="info">{message}</Notice>}
    <form onSubmit={submit} className="grid gap-5 rounded-lg border border-line bg-bg p-card-pad">
      <TextField label="Username" name="username" defaultValue={params.get('username') ?? ''} required maxLength={30} pattern=".*\S.*" hint="Enter the exact username without u/." />
      <Select label="Action" value={action} options={[{ value: 'ban', label: 'Ban user' }, { value: 'unban', label: 'Unban user' }]} onChange={setAction} />
      {action === 'ban' && <div className="grid gap-4">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-small font-medium">Common reasons</legend>
          <div className="flex flex-wrap gap-2">
            {BAN_REASONS.map(preset => <button
              key={preset.label}
              type="button"
              aria-pressed={reason === preset.reason}
              onClick={() => { setReason(preset.reason); setValidationError('') }}
              className="cursor-pointer rounded-btn border border-line-strong px-3 py-2 text-small text-muted hover:bg-surface hover:text-ink aria-pressed:border-accent aria-pressed:bg-surface aria-pressed:text-accent"
            >{preset.label}</button>)}
          </div>
        </fieldset>
        <TextArea label="Reason for ban" name="reason" value={reason} onChange={event => setReason(event.target.value)} required maxLength={500} hint="Choose a common reason or write your own. You can edit the text before submitting. Up to 500 characters; visible to the user when they try to log in." />
      </div>}
      <div><Button type="submit">Review {action === 'ban' ? 'ban' : 'unban'}</Button></div>
    </form>
    {pending && <ConfirmAction title={`${pending.action === 'ban' ? 'Ban' : 'Unban'} u/${pending.username}?`} label={pending.action === 'ban' ? 'Ban user' : 'Unban user'} pending={mutation.isPending} error={mutation.error} onClose={() => setPending(null)} onConfirm={() => mutation.mutate(pending)}>
      {pending.action === 'ban' ? <><p>This user will lose access to their account.</p><p className="mt-3 whitespace-pre-wrap break-words text-ink">Reason: {pending.reason}</p></> : 'This user will be able to log in again. Previous sessions will not be restored.'}
    </ConfirmAction>}
  </section>
}
