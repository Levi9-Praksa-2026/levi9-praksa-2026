import { NavLink, Outlet } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { useCurrentUser } from '@/features/users/useCurrentUser'
import { routes } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Notice'

/** Child pages never mount, or issue requests, before the session is confirmed as ADMIN. */
export function AdminLayout() {
  const { user, loading } = useCurrentUser()
  if (loading) return <Notice tone="info">Checking administrator access…</Notice>
  if (!user?.roles.includes('ADMIN')) return (
    <section className="grid gap-4 rounded-lg border border-line bg-bg p-card-pad">
      <ShieldCheck className="size-5 text-accent" aria-hidden="true" />
      <h1 className="text-h2">Admins only</h1>
      <p className="text-small text-muted">You need an administrator account to view this area.</p>
      <div><Button href={user ? routes.home : routes.login}>{user ? 'Go to home' : 'Log in'}</Button></div>
    </section>
  )
  return <div className="grid gap-5">
    <nav aria-label="Administration" className="flex flex-wrap gap-1 rounded-lg border border-line bg-bg p-2">
      {([[routes.admin, 'Overview'], [routes.adminCommunities, 'Communities'], [routes.adminUsers, 'Users'], [routes.adminPosts, 'Posts']] as const).map(([to, label]) => (
        <NavLink key={to} to={to} end className="rounded-btn px-4 py-2 text-small font-medium text-muted hover:bg-surface hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-accent">{label}</NavLink>
      ))}
    </nav>
    <Outlet />
  </div>
}
