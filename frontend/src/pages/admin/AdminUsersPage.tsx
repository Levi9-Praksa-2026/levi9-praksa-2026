import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { Ban, Check, CircleCheck, Layers, Pencil, Plus, Search, ShieldCheck, UserRound, UserRoundX } from 'lucide-react'
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
import { CreateUserDialog } from './CreateUserDialog'
import { EditUserDialog } from './EditUserDialog'
import { UserDetailsDialog } from './UserDetailsDialog'
import { UserBadges } from './UserBadges'

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
  const role = params.get('role')
  const filters: AdminUserFilters = {
    q: q || undefined,
    role: role === 'USER' || role === 'ADMIN' ? role : undefined,
    status: status === 'active' || status === 'banned' || status === 'deleted' ? status : undefined,
    page,
    size: PAGE_SIZE,
  }
  const list = useQuery({ queryKey: queryKeys.admin.userList(filters), queryFn: () => adminApi.users(filters) })
  const client = useQueryClient()
  const [target, setTarget] = useState<AdminUser | null>(null)
  const [details, setDetails] = useState<AdminUser | null>(null)
  const [editing, setEditing] = useState<{ user: AdminUser; returnToDetails: boolean } | null>(null)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
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
    <header className="flex flex-col items-start gap-4">
      <div><h1 id="admin-users-title" className="text-h2">Manage users</h1><p className="mt-1 text-small text-muted">Browse accounts, review their status, and manage access.</p></div>
      <Button onClick={() => { setMessage(''); setCreating(true) }}><Plus className="size-4" aria-hidden="true" />Create user</Button>
    </header>
    {message && <Notice tone="info">{message}</Notice>}
    <div className="grid gap-4 rounded-lg border border-line bg-bg p-card-pad">
      <form key={q} onSubmit={event => { event.preventDefault(); update('q', String(new FormData(event.currentTarget).get('q') ?? '').trim()) }} className="flex items-end gap-2">
        <TextField label="Search users" name="q" defaultValue={q} maxLength={254} placeholder="Username, name, or email" className="flex-1" />
        <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden="true" />Search</Button>
      </form>
      <div className="flex flex-wrap items-end justify-between gap-4">
      <SegmentedControl label="Account status" wrapOnMobile value={filters.status ?? 'all'} options={[
        { value: 'all', label: 'All', icon: <Layers className="size-4" aria-hidden="true" /> },
        { value: 'active', label: 'Active', icon: <CircleCheck className="size-4" aria-hidden="true" /> },
        { value: 'banned', label: 'Banned', icon: <Ban className="size-4" aria-hidden="true" /> },
        { value: 'deleted', label: 'Deleted', icon: <UserRoundX className="size-4" aria-hidden="true" /> },
      ]} onChange={value => update('status', value === 'all' ? '' : value)} />
      <SegmentedControl label="Role" value={filters.role ?? 'all'} options={[
        { value: 'all', label: 'All' },
        { value: 'USER', label: 'Users', icon: <UserRound className="size-4" aria-hidden="true" /> },
        { value: 'ADMIN', label: 'Admins', icon: <ShieldCheck className="size-4" aria-hidden="true" /> },
      ]} onChange={value => update('role', value === 'all' ? '' : value)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-small text-muted">
        <p role="status">{list.isPending ? 'Loading users…' : list.isError ? 'Results unavailable' : `${list.data?.totalElements.toLocaleString() ?? 0} ${list.data?.totalElements === 1 ? 'user' : 'users'}`}</p>
        {(q || filters.status || filters.role) && <button type="button" onClick={() => setParams({})} className="cursor-pointer rounded-btn px-2 py-1 font-medium text-accent hover:bg-surface">Clear filters</button>}
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
              <UserBadges user={user} />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" aria-label={`View details for u/${user.username}`} onClick={() => setDetails(user)}>Details</Button>
                {!user.deleted && <Button variant="secondary" aria-label={`Edit u/${user.username}`} onClick={() => { setMessage(''); setEditing({ user, returnToDetails: false }) }}><Pencil className="size-4" aria-hidden="true" />Edit user</Button>}
                {!user.deleted && user.role !== 'ADMIN' && <Button variant={user.banned ? 'secondary' : 'danger-outline'} aria-label={`${user.banned ? 'Unban' : 'Ban'} u/${user.username}`} onClick={() => { mutation.reset(); setMessage(''); setTarget(user) }}>{user.banned ? 'Unban user' : 'Ban user'}</Button>}
              </div>
            </div>
          </li>)}
        </ul>}
      </div>
      <Pagination page={page} totalPages={list.data?.totalPages ?? 0} totalElements={list.data?.totalElements} itemLabel="users" onChange={page => update('page', String(page))} />
      {page > 0 && !list.data?.content.length && <Button variant="secondary" onClick={() => update('page', '')}>Back to first page</Button>}
    </>}
    {creating && <CreateUserDialog onClose={() => setCreating(false)} onCreated={user => {
      setCreating(false)
      setMessage(`u/${user.username} created.`)
      setParams({})
      void client.invalidateQueries({ queryKey: queryKeys.admin.users })
    }} />}
    {target && (target.banned ? <ConfirmAction title={`Unban u/${target.username}?`} label="Unban user" pending={mutation.isPending} error={mutation.error} onClose={() => setTarget(null)} onConfirm={() => mutation.mutate({ user: target, reason: '' })}>
      This user will be able to log in again. Previous sessions will not be restored.
    </ConfirmAction> : <BanUserDialog user={target} pending={mutation.isPending} error={mutation.error} onClose={() => setTarget(null)} onConfirm={reason => mutation.mutate({ user: target, reason })} />)}
    {details && <UserDetailsDialog user={details} onClose={() => setDetails(null)} onEdit={() => {
      setEditing({ user: details, returnToDetails: true })
      setDetails(null)
      setMessage('')
    }} />}
    {editing && <EditUserDialog user={editing.user} onClose={() => {
      if (editing.returnToDetails) setDetails(editing.user)
      setEditing(null)
    }} onSaved={profile => {
      if (editing.returnToDetails) setDetails({ ...editing.user, ...profile })
      setEditing(null)
      setMessage(`u/${profile.username} updated.`)
      void client.invalidateQueries({ queryKey: queryKeys.admin.users })
    }} />}
  </section>
}

function BanUserDialog({ user, pending, error, onClose, onConfirm }: { user: AdminUser; pending: boolean; error: unknown; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) { setValidationError('Enter a reason for the ban.'); return }
    onConfirm(reason.trim())
  }
  return <Modal title="Ban user" onClose={onClose} busy={pending} size="lg">
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-6">
      <div className="flex min-w-0 items-start gap-4 rounded-md bg-surface p-4">
        <UserAvatar username={user.username} className="size-12 text-lead" />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-h3">{user.firstName} {user.lastName}</h3>
          <p className="mt-1 break-words text-small text-muted">u/{user.username}</p>
        </div>
      </div>
      <p className="text-small text-muted">This user will lose access to their account. Choose a reason below or write your own.</p>
      {error != null && <Notice tone="error">{adminError(error)}</Notice>}
      {validationError && <Notice tone="error">{validationError}</Notice>}
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <fieldset disabled={pending} className="min-w-0">
          <legend className="mb-2 text-small font-medium">Common reasons</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">{BAN_REASONS.map(preset => <button key={preset.label} type="button" aria-pressed={reason === preset.reason} onClick={() => { setReason(preset.reason); setValidationError('') }} className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md border border-line-strong px-3 py-2 text-left text-small text-muted hover:bg-surface hover:text-ink aria-pressed:border-accent aria-pressed:bg-surface aria-pressed:text-accent">
            <span className="min-w-0 break-words">{preset.label}</span>
            <Check className={reason === preset.reason ? 'size-4 flex-none' : 'size-4 flex-none opacity-0'} aria-hidden="true" />
          </button>)}</div>
        </fieldset>
        <TextArea label="Reason for ban" name="reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} className="sm:[&>textarea]:min-h-48" disabled={pending} required maxLength={500} hint="Edit the selected reason or write your own. Up to 500 characters; shown to the user when they try to log in." />
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" variant="danger" disabled={pending}>{pending ? 'Saving…' : 'Ban user'}</Button></div>
    </form>
  </Modal>
}
