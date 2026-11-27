import type { ReactNode } from 'react'
import { Ban, CalendarDays, Mail } from 'lucide-react'
import { UserAvatar } from '@/features/users/UserAvatar'
import type { AdminUser } from '@/shared/api/admin'
import { UserBadges } from './UserBadges'

const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
type EditableFields = { firstName: ReactNode; lastName: ReactNode; email: ReactNode }

/** Both dialogs share the same profile layout; the editor supplies just the three editable fields. */
export function UserProfileContent({ user, fields }: { user: AdminUser; fields?: EditableFields }) {
  return <div className="grid gap-6">
    <div className="flex items-start gap-4">
      <UserAvatar username={user.username} className="size-14 text-lead" />
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-h3">{user.firstName} {user.lastName}</h3>
        <p className="mt-1 break-words text-small text-muted">u/{user.username}</p>
        <div className="mt-3"><UserBadges user={user} /></div>
      </div>
    </div>
    <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
      {fields?.firstName ?? <ProfileField label="First name">{user.firstName}</ProfileField>}
      {fields?.lastName ?? <ProfileField label="Last name">{user.lastName}</ProfileField>}
      {fields?.email ?? <ProfileField label="Email address" icon={<Mail className="size-4" aria-hidden="true" />}>{user.email}</ProfileField>}
      <ProfileField label="Joined" icon={<CalendarDays className="size-4" aria-hidden="true" />}><time dateTime={user.createdAt}>{date(user.createdAt)}</time></ProfileField>
    </div>
    {user.banned && <section aria-label="Ban details" className="grid gap-3 rounded-md border border-line p-4">
      <h3 className="flex items-center gap-2 text-small font-semibold"><Ban className="size-4 text-accent" aria-hidden="true" />Ban details</h3>
      <p className="whitespace-pre-wrap break-words text-small">{user.banReason || 'No reason recorded.'}</p>
      {user.bannedAt && <p className="text-label text-muted">Banned on <time dateTime={user.bannedAt}>{date(user.bannedAt)}</time></p>}
    </section>}
  </div>
}

function ProfileField({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return <dl className="min-w-0 rounded-md bg-surface p-4">
    <dt className="flex items-center gap-2 text-small font-medium text-muted">{icon}{label}</dt>
    <dd className="mt-2 break-words text-body [overflow-wrap:anywhere]">{children}</dd>
  </dl>
}
