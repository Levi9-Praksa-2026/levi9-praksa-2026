import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { Search, ShieldCheck, UserRound } from 'lucide-react'
import { UserAvatar } from '@/features/users/UserAvatar'
import { adminApi, type AdminUser, type AdminUserFilters } from '@/shared/api/admin'
import { queryKeys } from '@/shared/api/queryKeys'
import { TextField } from '@/shared/ui/TextField'
import { TextArea } from '@/shared/ui/TextArea'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Notice'
import { Pagination } from '@/shared/ui/Pagination'
import { Modal } from '@/shared/ui/Modal'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { ConfirmAction } from './ui'
import { adminError } from './errors'

const BAN_REASONS = [
  { label: 'Spam', reason: 'Repeated spam or unsolicited advertising.' },
  { label: 'Harassment', reason: 'Harassment or bullying of other users.' },
  { label: 'Hate speech', reason: 'Hate speech or discriminatory content.' },
  { label: 'Inappropriate content', reason: 'Posting inappropriate or harmful content.' },
  { label: 'Impersonation', reason: 'Impersonating another person or organization.' },
] as const

const PAGE_SIZE = 5

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? params.get('username') ?? ''
  const rawPage = Number(params.get('page') ?? 0)
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0
  const status = params.get('status')
  const filters: AdminUserFilters = {
    q: q || undefined,
    status: status === 'active' || status === 'banned' || status === 'deleted' ? status : undefined,
    page,
    size: PAGE_SIZE,
  }
  const list = useQuery({ queryKey: queryKeys.admin.userList(filters), queryFn: () => adminApi.users(filters) })
  const client = useQueryClient()
  const [target, setTarget] = useState<AdminUser | null>(null)
  const [details, setDetails] = useState<AdminUser | null>(null)
  const [message, setMessage] = useState('')
  const mutation = useMutation({
    mutationFn: ({ user, reason }: { user: AdminUser; reason: string }) => user.banned ? adminApi.unbanUser(user.username) : adminApi.banUser(user.username, reason),
    onSuccess: (_, { user }) => {
      setTarget(null)
      setMessage(`u/${user.username} ${user.banned ? 'unbanned' : 'banned'}.`)
      void client.invalidateQueries({ queryKey: queryKeys.admin.users })
    },
  })
  function update(key: string, value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      // Preserve an author link's search when changing status or page.
      if (next.has('username')) { next.set('q', q); next.delete('username') }
      if (value) next.set(key, value); else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }
  return <section aria-labelledby="admin-users-title" className="grid gap-5">
    <header><h1 id="admin-users-title" className="text-h2">Manage users</h1><p className="mt-1 text-small text-muted">Browse accounts, review their status, and manage access.</p></header>
    {message && <Notice tone="info">{message}</Notice>}
    <div className="grid gap-4 rounded-lg border border-line bg-bg p-card-pad">
      <form key={q} onSubmit={event => { event.preventDefault(); update('q', String(new FormData(event.currentTarget).get('q') ?? '').trim()) }} className="flex items-end gap-2">
        <TextField label="Search users" name="q" defaultValue={q} maxLength={254} placeholder="Username, name, or email" className="flex-1" />
        <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden="true" />Search</Button>
      </form>
      <SegmentedControl label="Account status" value={filters.status ?? 'all'} options={[
        { value: 'all', label: 'All' }, { value: 'active', label: 'Active' },
        { value: 'banned', label: 'Banned' }, { value: 'deleted', label: 'Deleted' },
      ]} onChange={value => update('status', value === 'all' ? '' : value)} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-small text-muted">
        <p role="status">{list.isPending ? 'Loading users…' : list.isError ? 'Results unavailable' : `${list.data?.totalElements.toLocaleString() ?? 0} ${list.data?.totalElements === 1 ? 'user' : 'users'}`}</p>
        {(q || filters.status) && <button type="button" onClick={() => setParams({})} className="cursor-pointer rounded-btn px-2 py-1 font-medium text-accent hover:bg-surface">Clear filters</button>}
      </div>
    </div>
    {list.isPending ? <Notice tone="info">Loading users…</Notice> : list.isError ? <Notice tone="error">{adminError(list.error)} <button type="button" className="cursor-pointer underline" onClick={() => void list.refetch()}>Try again</button></Notice> : <>
      <div className="overflow-hidden rounded-lg border border-line bg-bg">
        {!list.data?.content.length ? <p className="p-card-pad text-small text-muted">No users found. Try another search or clear the filters.</p> : <ul className="divide-y divide-line">
          {list.data.content.map(user => <li key={user.id} className="grid gap-4 p-card-pad">
            <div className="flex items-start gap-3">
              <UserAvatar username={user.username} />
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-body font-semibold">{user.firstName} {user.lastName}</h2>
                <p className="break-words text-small text-muted">u/{user.username}</p>
                <p className="mt-1 break-all text-small text-muted">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-label">
                <span className="inline-flex items-center gap-1 rounded-btn bg-surface px-2 py-1 text-accent">{user.role === 'ADMIN' ? <ShieldCheck className="size-3" aria-hidden="true" /> : <UserRound className="size-3" aria-hidden="true" />}{user.role === 'ADMIN' ? 'Admin' : 'User'}</span>
                <span className="rounded-btn border border-line px-2 py-1 text-muted">{user.deleted ? 'Deleted' : user.banned ? 'Banned' : 'Active'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" aria-label={`View details for u/${user.username}`} onClick={() => setDetails(user)}>Details</Button>
                {!user.deleted && user.role !== 'ADMIN' && <Button variant="secondary" aria-label={`${user.banned ? 'Unban' : 'Ban'} u/${user.username}`} onClick={() => { mutation.reset(); setMessage(''); setTarget(user) }}>{user.banned ? 'Unban user' : 'Ban user'}</Button>}
              </div>
            </div>
          </li>)}
        </ul>}
      </div>
      <Pagination page={page} totalPages={list.data?.totalPages ?? 0} totalElements={list.data?.totalElements} itemLabel="users" onChange={page => update('page', String(page))} />
      {page > 0 && !list.data?.content.length && <Button variant="secondary" onClick={() => update('page', '')}>Back to first page</Button>}
    </>}
    {target && (target.banned ? <ConfirmAction title={`Unban u/${target.username}?`} label="Unban user" pending={mutation.isPending} error={mutation.error} onClose={() => setTarget(null)} onConfirm={() => mutation.mutate({ user: target, reason: '' })}>
      This user will be able to log in again. Previous sessions will not be restored.
    </ConfirmAction> : <BanUserDialog user={target} pending={mutation.isPending} error={mutation.error} onClose={() => setTarget(null)} onConfirm={reason => mutation.mutate({ user: target, reason })} />)}
    {details && <Modal title={`u/${details.username}`} onClose={() => setDetails(null)}>
      <dl className="grid gap-4 text-small">
        <Detail label="Name">{details.firstName} {details.lastName}</Detail>
        <Detail label="Email">{details.email}</Detail>
        <Detail label="Role">{details.role === 'ADMIN' ? 'Admin' : 'User'}</Detail>
        <Detail label="Status">{details.deleted ? 'Deleted' : details.banned ? 'Banned' : 'Active'}</Detail>
        <Detail label="Joined">{new Date(details.createdAt).toLocaleString()}</Detail>
        {details.banned && <><Detail label="Reason for ban">{details.banReason ?? 'No reason recorded.'}</Detail>{details.bannedAt && <Detail label="Banned on">{new Date(details.bannedAt).toLocaleString()}</Detail>}</>}
      </dl>
    </Modal>}
  </section>
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="font-medium text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{children}</dd></div>
}

function BanUserDialog({ user, pending, error, onClose, onConfirm }: { user: AdminUser; pending: boolean; error: unknown; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) { setValidationError('Enter a reason for the ban.'); return }
    onConfirm(reason.trim())
  }
  return <Modal title={`Ban u/${user.username}?`} onClose={onClose} busy={pending}>
    <form onSubmit={submit} className="grid gap-5">
      <p className="text-small text-muted">This user will lose access to their account.</p>
      {error != null && <Notice tone="error">{adminError(error)}</Notice>}
      {validationError && <Notice tone="error">{validationError}</Notice>}
      <fieldset disabled={pending} className="min-w-0">
        <legend className="mb-2 text-small font-medium">Common reasons</legend>
        <div className="flex flex-wrap gap-2">{BAN_REASONS.map(preset => <button key={preset.label} type="button" aria-pressed={reason === preset.reason} onClick={() => { setReason(preset.reason); setValidationError('') }} className="cursor-pointer rounded-btn border border-line-strong px-3 py-2 text-small text-muted hover:bg-surface hover:text-ink aria-pressed:border-accent aria-pressed:bg-surface aria-pressed:text-accent">{preset.label}</button>)}</div>
      </fieldset>
      <TextArea label="Reason for ban" name="reason" value={reason} onChange={event => setReason(event.target.value)} disabled={pending} required maxLength={500} hint="Choose a common reason or write your own. You can edit the text before submitting. Up to 500 characters; visible to the user when they try to log in." />
      <div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Ban user'}</Button></div>
    </form>
  </Modal>
}
