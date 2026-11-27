import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { CircleCheck, CirclePause, Clock3, Layers, Plus, RotateCcw, Search, Users } from 'lucide-react'
import { CommunityAvatar } from '@/features/communities/CommunityAvatar'
import { adminApi, type AdminCommunityFilters } from '@/shared/api/admin'
import { COMMUNITY_NAME_PATTERN } from '@/shared/api/contracts/communities'
import { queryKeys } from '@/shared/api/queryKeys'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/TextField'
import { TextArea } from '@/shared/ui/TextArea'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { Pagination } from '@/shared/ui/Pagination'
import { Modal } from '@/shared/ui/Modal'
import { Notice } from '@/shared/ui/Notice'
import { ConfirmAction } from './ui'
import { adminError } from './errors'

export function AdminCommunitiesPage() {
  const [params, setParams] = useSearchParams()
  const name = params.get('q') ?? ''
  const status = params.get('status') === 'active' ? 'active' : params.get('status') === 'inactive' || params.get('inactive') === '1' ? 'inactive' : 'all'
  const rawPage = Number(params.get('page') ?? 0)
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0
  const sort = params.get('sort') === 'top' ? 'top' : 'new'
  const filters: AdminCommunityFilters = { name: name || undefined, status: status === 'all' ? undefined : status, page, size: 10, sort }
  const list = useQuery({ queryKey: queryKeys.communities.adminList(filters), queryFn: () => adminApi.communities(filters) })
  const [editor, setEditor] = useState<{ name?: string } | null>(null)
  const [target, setTarget] = useState<{ name: string; inactive: boolean } | null>(null)
  const [message, setMessage] = useState('')
  const client = useQueryClient()
  const changeStatus = useMutation({
    mutationFn: ({ name, inactive }: { name: string; inactive: boolean }) => inactive ? adminApi.reactivateCommunity(name) : adminApi.deactivateCommunity(name),
    onSuccess: (_, target) => {
      setTarget(null)
      setMessage(`l/${target.name} ${target.inactive ? 'reactivated' : 'shut down'}.`)
      void client.invalidateQueries({ queryKey: queryKeys.communities.all }); void client.invalidateQueries({ queryKey: ['admin', 'community'] })
    },
  })
  function update(key: string, value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value); else next.delete(key)
      if (key === 'status') next.delete('inactive')
      if (key !== 'page') next.delete('page')
      return next
    })
  }
  return <section className="grid gap-5" aria-labelledby="admin-communities-title">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 id="admin-communities-title" className="text-h2">Manage communities</h1><p className="mt-1 text-small text-muted">Create spaces for discussion and keep their details up to date.</p></div>
      <Button onClick={() => { setMessage(''); setEditor({}) }}><Plus className="size-4" aria-hidden="true" />Create community</Button>
    </header>
    {message && <Notice tone="info">{message}</Notice>}
    <div className="grid gap-4 rounded-lg border border-line bg-bg p-card-pad">
      <form key={name} onSubmit={event => { event.preventDefault(); update('q', String(new FormData(event.currentTarget).get('q') ?? '').trim()) }} className="flex items-end gap-2">
        <TextField className="flex-1" label="Search communities" name="q" defaultValue={name} maxLength={50} placeholder="Community name" />
        <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden="true" />Search</Button>
      </form>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
        <SegmentedControl label="Status" value={status} options={[
          { value: 'all', label: 'All', icon: <Layers className="size-4" aria-hidden="true" /> },
          { value: 'active', label: 'Active', icon: <CircleCheck className="size-4" aria-hidden="true" /> },
          { value: 'inactive', label: 'Inactive', icon: <CirclePause className="size-4" aria-hidden="true" /> },
        ]} onChange={value => update('status', value === 'all' ? '' : value)} />
        <SegmentedControl label="Sort by" value={sort} options={[
          { value: 'new', label: 'Newest', icon: <Clock3 className="size-4" aria-hidden="true" /> },
          { value: 'top', label: 'Most members', icon: <Users className="size-4" aria-hidden="true" /> },
        ]} onChange={value => update('sort', value === 'new' ? '' : value)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-small text-muted">
        <p role="status">{list.isPending ? 'Loading communities…' : list.isError ? 'Results unavailable' : `${list.data?.totalElements.toLocaleString() ?? 0} ${list.data?.totalElements === 1 ? 'community' : 'communities'}`} · {status === 'all' ? 'All statuses' : status === 'active' ? 'Active only' : 'Inactive only'}</p>
        {(name || status !== 'all' || sort !== 'new') && <button type="button" onClick={() => setParams({})} className="inline-flex cursor-pointer items-center gap-1.5 rounded-btn px-2 py-1 font-medium text-accent hover:bg-surface"><RotateCcw className="size-3.5" aria-hidden="true" />Reset view</button>}
      </div>
    </div>
    {list.isPending ? <Notice tone="info">Loading communities…</Notice> : list.isError ? <Notice tone="error">{adminError(list.error)} <button type="button" onClick={() => void list.refetch()} className="cursor-pointer underline">Try again</button></Notice> : (
      <>
        <div className="overflow-hidden rounded-lg border border-line bg-bg">
          {!list.data?.content.length ? <p className="p-card-pad text-small text-muted">No communities found. Try another search or clear the status filter.</p> : <ul className="divide-y divide-line">
            {list.data.content.map(community => <li key={community.name} className="flex flex-wrap items-center gap-3 p-card-pad">
              <CommunityAvatar name={community.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium">l/{community.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-label text-muted">
                  <span>{community.memberCount.toLocaleString()} members</span>
                  <span className="inline-flex items-center gap-1 rounded-btn bg-surface px-2 py-0.5 text-ink">{community.active ? <CircleCheck className="size-3" aria-hidden="true" /> : <CirclePause className="size-3" aria-hidden="true" />}{community.active ? 'Active' : 'Inactive'}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 max-sm:w-full">
                <Button variant="secondary" onClick={() => { setMessage(''); setEditor({ name: community.name }) }}>Edit details</Button>
                <Button variant={community.active ? 'danger-outline' : 'secondary'} onClick={() => { changeStatus.reset(); setTarget({ name: community.name, inactive: !community.active }) }}>{community.active ? 'Shut down' : 'Reactivate'}</Button>
              </div>
            </li>)}
          </ul>}
        </div>
        <Pagination page={page} totalPages={list.data?.totalPages ?? 0} totalElements={list.data?.totalElements} itemLabel="communities" onChange={page => update('page', String(page))} />
        {page > 0 && !list.data?.content.length && <Button variant="secondary" onClick={() => update('page', '')}>Back to first page</Button>}
      </>
    )}
    {editor && <CommunityEditor name={editor.name} onClose={() => setEditor(null)} onSaved={name => { setEditor(null); setMessage(`l/${name} saved.`); void client.invalidateQueries({ queryKey: queryKeys.communities.all }); void client.invalidateQueries({ queryKey: ['admin', 'community'] }) }} />}
    {target && <ConfirmAction destructive={!target.inactive} title={`${target.inactive ? 'Reactivate' : 'Shut down'} l/${target.name}?`} label={target.inactive ? 'Reactivate community' : 'Shut down community'} pending={changeStatus.isPending} error={changeStatus.error} onClose={() => setTarget(null)} onConfirm={() => changeStatus.mutate(target)}>
      {target.inactive ? 'This community will become visible in the directory and accept members and new posts again.' : 'This hides the community from the directory and prevents new posts. Its data is kept, and you can reactivate it later.'}
    </ConfirmAction>}
  </section>
}

function CommunityEditor({ name, onClose, onSaved }: { name?: string; onClose: () => void; onSaved: (name: string) => void }) {
  const detail = useQuery({ queryKey: queryKeys.admin.community(name), queryFn: () => adminApi.community(name!), enabled: !!name })
  const mutation = useMutation({
    mutationFn: async ({ communityName, description }: { communityName: string; description: string }) => {
      if (name) await adminApi.editCommunity(name, description)
      else await adminApi.createCommunity({ name: communityName, description })
    },
    onSuccess: (_, values) => onSaved(values.communityName),
  })
  const [nameError, setNameError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const communityName = name ?? String(fields.get('name') ?? '').trim()
    if (!COMMUNITY_NAME_PATTERN.test(communityName)) { setNameError('Use 1–50 letters, digits, underscores or hyphens, without l/.'); return }
    setNameError('')
    mutation.mutate({ communityName, description: String(fields.get('description') ?? '') })
  }
  return <Modal title={name ? 'Edit community' : 'Create community'} onClose={onClose} busy={mutation.isPending} size="lg">
    {name && detail.isPending ? <Notice tone="info">Loading community details…</Notice> : name && detail.isError ? <Notice tone="error">{adminError(detail.error)} <button type="button" className="cursor-pointer underline" onClick={() => void detail.refetch()}>Try again</button></Notice> : (
      <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-6">
        {mutation.isError && <Notice tone="error">{adminError(mutation.error)}</Notice>}
        {name ? <div className="flex min-w-0 items-start gap-4 rounded-md bg-surface p-4">
          <CommunityAvatar name={detail.data?.name ?? name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-lead font-semibold [overflow-wrap:anywhere]">l/{detail.data?.name ?? name}</p>
            <p className="mt-1 text-small text-muted">Update the community description.</p>
          </div>
        </div> : <TextField label="Community name" name="name" required disabled={mutation.isPending} maxLength={50} error={nameError} hint="1–50 letters, digits, underscores or hyphens. Leave out l/." />}
        <TextArea label="Description" name="description" defaultValue={detail.data?.description ?? ''} rows={6} maxLength={2000} disabled={mutation.isPending} hint="Up to 2,000 characters. An empty description is allowed." />
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : name ? 'Save description' : 'Create community'}</Button></div>
      </form>
    )}
  </Modal>
}
