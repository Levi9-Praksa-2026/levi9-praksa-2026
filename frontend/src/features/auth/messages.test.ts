import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { authErrorMessage, isEmail, signUpHref } from './messages'

const problem = (status: number, extra: Record<string, unknown> = {}, retryAfter?: number) => new ApiError({ status, ...extra }, retryAfter)

describe('authErrorMessage', () => {
  it('says the same for a wrong password and an unknown email', () => {
    expect(authErrorMessage(problem(401, { errorType: 'INVALID_CREDENTIALS' }), 'login')).toBe('Invalid email or password.')
  })

  it('gives the ban reason when there is one', () => {
    expect(authErrorMessage(problem(403, { errorType: 'USER_BANNED', banReason: 'Spam' }), 'login')).toBe('Your account is banned: Spam')
    expect(authErrorMessage(problem(403, { errorType: 'USER_BANNED', banReason: null }), 'login')).toBe('Your account is banned.')
  })

  it('says how long to wait after too many attempts', () => {
    expect(authErrorMessage(problem(429, { errorType: 'RATE_LIMITED' }, 30), 'login')).toBe('Too many attempts. Try again in 30 seconds.')
    expect(authErrorMessage(problem(429, {}, 1), 'login')).toBe('Too many attempts. Try again in 1 second.')
    expect(authErrorMessage(problem(429), 'login')).toBe('Too many attempts. Try again in a minute.')
  })

  it('never says an email is taken', () => {
    expect(authErrorMessage(problem(409, { errorType: 'REGISTRATION_FAILED' }), 'register')).not.toMatch(/email/i)
  })

  it('separates a network failure from a server one', () => {
    expect(authErrorMessage(new TypeError('Failed to fetch'), 'login')).toMatch(/connection/)
    expect(authErrorMessage(problem(500), 'login')).toMatch(/our side/)
  })
})

describe('isEmail and signUpHref', () => {
  it('checks the shape only', () => {
    expect(['ana@levi9.com', 'a.b+c@x.co'].map(isEmail)).toEqual([true, true])
    expect(['ana', 'ana@levi9', 'a b@x.co', `${'a'.repeat(250)}@x.co`].map(isEmail)).toEqual([false, false, false, false])
  })

  it('carries the email to sign-up', () => {
    expect(signUpHref(' ana@levi9.com ')).toBe('/signup?email=ana%40levi9.com')
    expect(signUpHref('')).toBe('/signup')
  })
})
