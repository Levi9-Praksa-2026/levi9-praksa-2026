import { Ban, CircleCheck, ShieldCheck, UserRound, UserRoundX } from 'lucide-react'
import type { AdminUser } from '@/shared/api/admin'

export function UserBadges({ user }: { user: Pick<AdminUser, 'role' | 'banned' | 'deleted'> }) {
  const StatusIcon = user.deleted ? UserRoundX : user.banned ? Ban : CircleCheck
  return <div className="flex flex-wrap items-center gap-2 text-label">
    <span className="inline-flex items-center gap-1.5 rounded-btn bg-surface px-2.5 py-1 font-medium text-accent">{user.role === 'ADMIN' ? <ShieldCheck className="size-3.5" aria-hidden="true" /> : <UserRound className="size-3.5" aria-hidden="true" />}{user.role === 'ADMIN' ? 'Admin' : 'User'}</span>
    <span className="inline-flex items-center gap-1.5 rounded-btn border border-line px-2.5 py-1 text-muted"><StatusIcon className="size-3.5" aria-hidden="true" />{user.deleted ? 'Deleted' : user.banned ? 'Banned' : 'Active'}</span>
  </div>
}
