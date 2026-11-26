import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from './admin'
import { ApiError } from './errors'

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => { fetchMock.mockReset(); vi.unstubAllGlobals() })

function noContent() { fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 })) }
function request() {
  const [path, options] = fetchMock.mock.calls.at(-1)!
  return { path, ...options, body: options?.body ? JSON.parse(String(options.body)) : undefined }
}

describe('admin gateway contracts', () => {
  it('requests the paginated user directory with search and status filters', async () => {
    const result = { content: [{ id: 7, username: 'reader', banned: true }], page: 1, size: 5, totalPages: 2, totalElements: 6 };
    fetchMock.mockResolvedValueOnce(Response.json(result));
    expect(await adminApi.users({ q: 'name@example.test', status: 'banned', page: 1, size: 5 })).toEqual(result);
    const url = new URL(String(request().path), 'http://localhost');
    expect(url.pathname).toBe('/api/admin/users');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'name@example.test', status: 'banned', page: '1', size: '5' });
  })

  it('uses the shared community endpoint for all, active and inactive admin views', async () => {
    for (const status of [undefined, 'active', 'inactive'] as const) {
      fetchMock.mockResolvedValueOnce(Response.json({ content: [], totalElements: 0 }));
      await adminApi.communities({ status, name: 'front', sort: 'top', page: 2, size: 10 });
      const url = new URL(String(request().path), 'http://localhost');
      expect(url.pathname).toBe('/api/communities');
      expect(url.searchParams.has('status')).toBe(false);
      expect(url.searchParams.get('inactive')).toBe(status === 'active' ? 'false' : status === 'inactive' ? 'true' : 'all');
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('sort')).toBe('top');
      expect(url.searchParams.get('name')).toBe('front');
    }
  })

  it('uses the dedicated admin namespace for ban and unban, encoding the username', async () => {
    noContent()
    await adminApi.banUser('test/user', 'Repeated spam')
    expect(request()).toMatchObject({ path: '/api/admin/users/test%2Fuser/ban', method: 'POST', credentials: 'same-origin', body: { reason: 'Repeated spam' } })
    noContent()
    await adminApi.unbanUser('test/user')
    expect(request()).toMatchObject({ path: '/api/admin/users/test%2Fuser/ban', method: 'DELETE' })
  })

  it('creates a community and edits only its description', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ name: 'new-team' }, { status: 201 }))
    expect(await adminApi.createCommunity({ name: 'new-team', description: '' })).toEqual({ name: 'new-team' })
    expect(request()).toMatchObject({ path: '/api/communities', method: 'POST', body: { name: 'new-team', description: '' } })
    noContent()
    await adminApi.editCommunity('new-team', 'Updated')
    expect(request()).toMatchObject({ path: '/api/communities/new-team', method: 'PATCH', body: { description: 'Updated' } })
  })

  it('uses reversible shutdown endpoints and soft post removal', async () => {
    noContent()
    await adminApi.deactivateCommunity('frontend')
    expect(request()).toMatchObject({ path: '/api/communities/frontend', method: 'DELETE' })
    noContent()
    await adminApi.reactivateCommunity('frontend')
    expect(request()).toMatchObject({ path: '/api/communities/frontend/reactivate', method: 'POST' })
    noContent()
    await adminApi.removePost(42)
    expect(request()).toMatchObject({ path: '/api/posts/42', method: 'DELETE' })
  })

  it('reads paginated real posts and comments without mock-only DTO fields', async () => {
    const posts = { content: [{ id: 42, title: 'Hello', images: [] }], totalPages: 3 }
    fetchMock.mockResolvedValueOnce(Response.json(posts))
    expect(await adminApi.posts('a & b', 2)).toEqual(posts)
    expect(request().path).toBe('/api/posts?q=a+%26+b&page=2&size=10')
    fetchMock.mockResolvedValueOnce(Response.json({ content: [], totalPages: 0 }))
    await adminApi.comments(42, 1)
    expect(request().path).toBe('/api/posts/42/comments?page=1&size=10')
  })

  it.each([
    [403, 'ADMIN_BAN_FORBIDDEN'], [409, 'USER_ALREADY_BANNED'], [409, 'USER_NOT_BANNED'], [404, 'USER_NOT_FOUND'],
  ])('preserves backend refusal %s/%s instead of reporting success', async (status, errorType) => {
    fetchMock.mockResolvedValueOnce(Response.json({ status, errorType, detail: 'Action refused' }, { status }))
    await expect(adminApi.banUser('colleague', 'Reason')).rejects.toMatchObject({ status, errorType })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps backend validation errors for display beside the action', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 400, errors: [{ field: 'reason', message: 'must not be blank' }] }, { status: 400 }))
    await expect(adminApi.banUser('colleague', '')).rejects.toBeInstanceOf(ApiError)
  })
})
