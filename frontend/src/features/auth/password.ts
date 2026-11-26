import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '@/shared/api/contracts/auth'

/** Backend acceptance rules, separate from the advisory guessability estimate. */
export interface PasswordCheck {
  /** At least 12 characters, counted like Java's `String.length()` (the backend's @Size). */
  longEnough: boolean
  /** At most 72 bytes in UTF-8 (BCrypt ignores the rest, so the backend refuses more). */
  fitsLimit: boolean
}

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

export function checkPassword(password: string): PasswordCheck {
  const longEnough = password.length >= PASSWORD_MIN_LENGTH
  const fitsLimit = utf8Bytes(password) <= PASSWORD_MAX_BYTES
  return { longEnough, fitsLimit }
}
