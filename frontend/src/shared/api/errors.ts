import type { FieldViolation, ProblemDetail } from './contracts/common'

/**
 * The one error every API function throws: the backend's problem details, as an Error.
 * Branch on `status` or `errorType`, never on the message text.
 */
export class ApiError extends Error {
  readonly status: number
  readonly errorType: string | undefined
  readonly errors: FieldViolation[]
  readonly problem: ProblemDetail
  /** Seconds to wait before trying again, from a `Retry-After` header (429, 503). Undefined without one. */
  readonly retryAfter: number | undefined

  constructor(problem: ProblemDetail, retryAfter?: number) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${problem.status}`)
    this.name = 'ApiError'
    this.status = problem.status
    this.errorType = problem.errorType
    this.errors = problem.errors ?? []
    this.problem = problem
    this.retryAfter = retryAfter
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
