import { isApiError } from '@/shared/api/errors'

/** post-service's limits (`PostLimits.java`). */
export const TITLE_MAX = 300
export const CONTENT_MAX = 40_000

/** What went wrong saving an edit, in words for the author. */
export function saveErrorMessage(error: unknown): string {
  if (!isApiError(error)) return "Couldn't save. Check your connection and try again."
  switch (error.status) {
    case 400: return error.errors[0]?.message ?? 'Check the title and text.'
    case 401: return 'Your session ended. Log in again to save.'
    case 403: return 'Only the author can edit this post.'
    case 404: return 'This post was removed meanwhile.'
    default: return "Couldn't save. Try again in a moment."
  }
}

/** What went wrong removing a post. */
export function removeErrorMessage(error: unknown): string {
  if (!isApiError(error)) return "Couldn't remove it. Check your connection and try again."
  switch (error.status) {
    case 401: return 'Your session ended. Log in again to remove it.'
    case 403: return 'Only the author or an admin can remove this post.'
    case 404: return 'This post no longer exists.'
    default: return "Couldn't remove it. Try again in a moment."
  }
}
