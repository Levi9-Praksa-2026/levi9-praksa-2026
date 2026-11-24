import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '@/shared/api/contracts/auth'

/*
  What the sign-up form says about a password while it is typed. The backend's only rules are the length ones
  (at least 12 characters, at most 72 bytes); there are no "needs a digit" rules, on purpose (OWASP ASVS).
  The strength is advice: length counts most, mixing kinds of characters a little.
*/

export type Strength = 0 | 1 | 2 | 3 | 4

export const STRENGTH_LABELS: Record<Strength, string> = {
  0: 'Too short',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
}

export interface PasswordCheck {
  /** At least 12 characters, counted like Java's `String.length()` (the backend's @Size). */
  longEnough: boolean
  /** At most 72 bytes in UTF-8 (BCrypt ignores the rest, so the backend refuses more). */
  fitsLimit: boolean
  strength: Strength
}

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

export function checkPassword(password: string): PasswordCheck {
  const longEnough = password.length >= PASSWORD_MIN_LENGTH
  const fitsLimit = utf8Bytes(password) <= PASSWORD_MAX_BYTES
  return { longEnough, fitsLimit, strength: longEnough ? strengthOf(password) : 0 }
}

/** 1 to 4 for a password that is long enough: +1 at 16 and at 20 characters, +1 for mixing 3 or more kinds. */
function strengthOf(password: string): Strength {
  // "aaaaaaaaaaaa" or "abababababab" is long but guessed at once
  if (new Set(password).size < 5) return 1
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter(kind => kind.test(password)).length
  let points = 1
  if (password.length >= 16) points++
  if (password.length >= 20) points++
  if (kinds >= 3) points++
  return Math.min(points, 4) as Strength
}
