// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { adminApi } from '@/shared/api/admin'
import { AdminCommunitiesPage } from './AdminCommunitiesPage'

vi.mock('@/shared/api/admin', () => ({ adminApi: {
  communities: vi.fn().mockResolvedValue({ content: [{ name: 'retired', memberCount: 7, active: false }], page: 0, size: 10, totalPages: 1, totalElements: 1 }),
  community: vi.fn().mockResolvedValue({ id: 3, name: 'retired', description: 'Archived description', memberCount: 7, active: false, createdAt: '2026-11-20T10:00:00Z' }),
  editCommunity: vi.fn().mockResolvedValue(undefined),
} }))

const container = document.createElement('div')
const root = createRoot(container)
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })

afterEach(() => {
  act(() => root.unmount())
  client.clear()
  container.remove()
  vi.unstubAllGlobals()
})

it('loads and saves details of an inactive community without reactivating it', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  document.body.appendChild(container)
  await act(async () => {
    root.render(<QueryClientProvider client={client}><MemoryRouter><AdminCommunitiesPage /></MemoryRouter></QueryClientProvider>)
  })
  await vi.waitFor(() => expect(container.textContent).toContain('Edit details'))
  const edit = [...container.querySelectorAll('button')].find(button => button.textContent === 'Edit details')!
  await act(async () => { edit.click() })
  await vi.waitFor(() => expect(container.querySelector('textarea')?.value).toBe('Archived description'))
  expect(adminApi.community).toHaveBeenCalledWith('retired')
  container.querySelector('textarea')!.value = 'Updated archive'
  await act(async () => {
    container.querySelector('dialog form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await vi.waitFor(() => expect(adminApi.editCommunity).toHaveBeenCalledWith('retired', 'Updated archive'))
  await vi.waitFor(() => expect(container.textContent).toContain('saved.'))
  expect(container.textContent).toContain('Inactive')
  expect(container.textContent).toContain('Reactivate')
})
