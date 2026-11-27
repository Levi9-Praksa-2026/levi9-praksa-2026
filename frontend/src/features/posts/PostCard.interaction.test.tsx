// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostResponse } from '@/shared/api/contracts/posts'
import { queryKeys } from '@/shared/api/queryKeys'
import { votePost } from '@/shared/api/posts'
import { PostCard } from './PostCard'

vi.mock('@/shared/api/posts', () => ({ votePost: vi.fn().mockResolvedValue(undefined), unvotePost: vi.fn().mockResolvedValue(undefined) }))

const post: PostResponse = {
  id: 7, title: 'Post title', content: 'Selectable preview text', authorId: 2, authorUsername: 'ana',
  communityId: 3, communityName: 'backend', score: 12, commentCount: 1,
  createdAt: '2026-11-25T09:00:00Z', updatedAt: null, images: [{ id: 1, url: '/image-1' }],
}

let container: HTMLDivElement
let root: Root
let client: QueryClient

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function render(images = post.images) {
  act(() => root.render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/feed']}><PostCard post={{ ...post, images }} /><Location /></MemoryRouter>
    </QueryClientProvider>,
  ))
}

function click(element: Element, options: MouseEventInit = {}, type = 'click') {
  act(() => { element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...options })) })
}

function location() { return container.querySelector('[data-testid="location"]')!.textContent }
function labelled(label: string) { return document.querySelector(`[aria-label="${label}"]`)! }

beforeEach(() => {
  // jsdom does not implement native modal behavior; focus containment is a browser responsibility.
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
    this.querySelector<HTMLElement>('button')?.focus()
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute('open') }
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(queryKeys.me, { id: 5, username: 'reader', roles: ['USER'] })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  client.clear()
  document.documentElement.style.overflow = ''
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PostCard interactions', () => {
  it('opens the post when clicking its body, but not when selecting text', () => {
    render()
    const preview = container.querySelector('p')!
    const range = document.createRange()
    range.selectNodeContents(preview)
    window.getSelection()!.addRange(range)
    click(preview)
    expect(location()).toBe('/feed')
    window.getSelection()!.removeAllRanges()
    click(preview)
    expect(location()).toBe('/posts/7')
  })

  it.each([
    ['control click', { ctrlKey: true }, 'click'],
    ['command click', { metaKey: true }, 'click'],
    ['middle click', { button: 1 }, 'auxclick'],
  ])('opens a new tab on %s', (_name, options, event) => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render()
    click(container.querySelector('p')!, options, event)
    expect(open).toHaveBeenCalledWith('/posts/7', '_blank', 'noopener,noreferrer')
    expect(location()).toBe('/feed')
  })

  it('keeps vote and share interactions on the feed', async () => {
    render()
    await act(async () => {
      click(labelled('Upvote'))
      click([...container.querySelectorAll('button')].find(button => button.textContent === 'Share')!)
    })
    expect(location()).toBe('/feed')
    expect(votePost).toHaveBeenCalledWith(7, 1)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/posts/7`)
  })

  it('opens a modal image and restores focus and scroll state on close', () => {
    document.documentElement.style.overflow = 'auto'
    render()
    const trigger = labelled('Enlarge image') as HTMLButtonElement
    trigger.focus()
    click(trigger)
    expect(location()).toBe('/feed')
    expect(document.querySelector('dialog[open] img')?.getAttribute('src')).toBe('/image-1')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(labelled('Close image'))
    click(document.querySelector('dialog img')!)
    expect(document.querySelector('dialog[open]')).not.toBeNull()
    click(labelled('Close image'))
    expect(document.querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.documentElement.style.overflow).toBe('auto')
  })

  it('opens a carousel image and closes on Escape or backdrop click', () => {
    render([{ id: 1, url: '/image-1' }, { id: 2, url: '/image-2' }])
    click(labelled('Enlarge image 1'))
    let dialog = document.querySelector('dialog')!
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/image-1')
    const cancel = new Event('cancel', { bubbles: false, cancelable: true })
    act(() => { dialog.dispatchEvent(cancel) })
    expect(cancel.defaultPrevented).toBe(true)
    expect(document.querySelector('dialog')).toBeNull()
    click(labelled('Enlarge image 1'))
    dialog = document.querySelector('dialog')!
    click(dialog)
    expect(document.querySelector('dialog')).toBeNull()
    expect(location()).toBe('/feed')
  })
})
