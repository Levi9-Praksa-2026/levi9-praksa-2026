import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminLayout } from './AdminLayout'

const session = vi.hoisted(() => ({ loading: false, user: null as { roles: string[] } | null | undefined }))
vi.mock('@/features/users/useCurrentUser', () => ({ useCurrentUser: () => session }))
const childMounted = vi.fn()
function ProtectedPage() { childMounted(); return <p>Protected admin content</p> }
function render() {
  return renderToStaticMarkup(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<AdminLayout />}><Route index element={<ProtectedPage />} /></Route></Routes></MemoryRouter>)
}

beforeEach(() => { childMounted.mockClear(); session.loading = false; session.user = null })
describe('admin area access', () => {
  it('does not mount protected pages while the session is loading', () => {
    session.loading = true
    session.user = undefined
    expect(render()).toContain('Checking administrator access')
    expect(childMounted).not.toHaveBeenCalled()
  })
  it('does not mount protected pages for anonymous visitors', () => {
    expect(render()).toContain('Admins only')
    expect(childMounted).not.toHaveBeenCalled()
  })
  it('does not mount protected pages for regular users', () => {
    session.user = { roles: ['USER'] }
    expect(render()).toContain('Admins only')
    expect(childMounted).not.toHaveBeenCalled()
  })
  it('mounts protected pages and navigation for admins', () => {
    session.user = { roles: ['USER', 'ADMIN'] }
    expect(render()).toContain('Protected admin content')
    expect(childMounted).toHaveBeenCalledOnce()
  })
})
