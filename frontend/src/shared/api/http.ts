import type { ProblemDetail } from './contracts/common'
import { ApiError } from './errors'

/*
  The one way the app talks to the backend. Everything is on the page's own origin (the gateway is
  behind the same host), so the gateway's session cookie goes along by itself. The app never sees a
  token and never sets an Authorization header: the gateway keeps the tokens and removes that header.
*/

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: Method
  /** `?a=1&b=2`. null and undefined are left out. */
  query?: Record<string, QueryValue>
  /** A plain value is sent as JSON. URLSearchParams (a form) and FormData (files) are sent as they are. */
  body?: unknown
  headers?: Record<string, string>
  /**
   * Send the gateway's CSRF token on a write (POST, PUT, PATCH, DELETE). On by default. Login and register
   * turn it off: they go to auth-service, which checks its own token (`GET /api/auth/csrf`).
   */
  xsrf?: boolean
  signal?: AbortSignal
}

const WRITES: ReadonlySet<Method> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** The cookie the gateway writes on every answer, and the header it expects the same value back in. */
export const XSRF_COOKIE = 'XSRF-TOKEN'
export const XSRF_HEADER = 'X-XSRF-TOKEN'

/**
 * Sends one request and answers the parsed JSON body (undefined when there is none, like a 204).
 * Anything but a 2xx rejects with an ApiError carrying the problem details; a network failure rejects
 * with fetch's own TypeError.
 */
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, headers: extra, xsrf = true, signal } = options

  const headers = new Headers({ Accept: 'application/json, application/problem+json' })
  let payload: BodyInit | undefined
  if (body instanceof URLSearchParams || body instanceof FormData) {
    payload = body // fetch sets the Content-Type (and the multipart boundary) itself
  } else if (body !== undefined) {
    payload = JSON.stringify(body)
    headers.set('Content-Type', 'application/json')
  }
  if (xsrf && WRITES.has(method)) {
    // read right before each write: the gateway changes the token, so a copy kept from earlier goes stale
    const token = readCookie(XSRF_COOKIE)
    if (token) headers.set(XSRF_HEADER, token)
  }
  for (const [name, value] of Object.entries(extra ?? {})) headers.set(name, value)

  const response = await fetch(withQuery(path, query), {
    method,
    headers,
    body: payload,
    credentials: 'same-origin',
    signal,
  })

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204 || !isJson(response)) return undefined as T
  return (await response.json()) as T
}

function withQuery(path: string, query: RequestOptions['query']): string {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

function isJson(response: Response): boolean {
  return /\bjson\b/.test(response.headers.get('Content-Type') ?? '')
}

/** The backend's problem details, or a stand-in built from the status when the body isn't one (a proxy's error page). */
async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetail = { status: response.status, title: response.statusText || undefined }
  if (isJson(response)) {
    try {
      problem = { ...(await response.json() as Partial<ProblemDetail>), status: response.status }
    } catch {
      // not valid JSON after all: keep the stand-in
    }
  }
  return new ApiError(problem, parseRetryAfter(response.headers.get('Retry-After')))
}

/** `Retry-After` is either seconds ("30") or a date; both become seconds from now. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined
  if (/^\d+$/.test(value.trim())) return Number(value)
  const at = Date.parse(value)
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - now) / 1000))
}

/** One cookie's value, or undefined. Only cookies scripts may read are visible here (not the session). */
export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}
