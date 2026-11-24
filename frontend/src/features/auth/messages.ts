import { EMAIL_MAX_LENGTH } from '@/shared/api/contracts/auth'
import { isApiError } from '@/shared/api/errors'
import { routes } from '@/shared/config/routes'

/** Looks like an email: something@something.something. The backend checks it properly. */
export function isEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/** The sign-up page with the email already filled in. */
export function signUpHref(email: string): string {
  const value = email.trim()
  return value ? `${routes.signUp}?${new URLSearchParams({ email: value })}` : routes.signUp
}

/**
 * The sentence for a failed login or register, from the backend's answer (frontend-auth-notes.md). Never says
 * whether an email has an account: the backend keeps that secret on purpose.
 */
export function authErrorMessage(error: unknown, action: 'login' | 'register'): string {
  if (!isApiError(error)) return "We couldn't reach Levddit. Check your connection and try again."
  if (error.status === 401) return 'Invalid email or password.'
  if (error.errorType === 'USER_BANNED') {
    const reason = error.problem.banReason?.trim()
    return reason ? `Your account is banned: ${reason}` : 'Your account is banned.'
  }
  if (error.status === 429) {
    const wait = error.retryAfter
    return wait ? `Too many attempts. Try again in ${wait} ${wait === 1 ? 'second' : 'seconds'}.` : 'Too many attempts. Try again in a minute.'
  }
  if (error.errorType === 'REGISTRATION_FAILED') return "We couldn't create this account. If you already have one, log in instead."
  if (error.status === 400 && action === 'register') return 'Some fields need another look.'
  return 'Something went wrong on our side. Try again in a moment.'
}
