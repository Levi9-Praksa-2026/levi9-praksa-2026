import { NAME_MAX_LENGTH } from '@/shared/api/contracts/auth'

/** The same rules the backend's PATCH /api/users/me applies to first and last names. */
export function checkName(value: string, label: string): string | undefined {
  const text = value.trim()
  if (!text) return `${label} is required`
  if (text.length > NAME_MAX_LENGTH) return `Use at most ${NAME_MAX_LENGTH} characters`
  return undefined
}
