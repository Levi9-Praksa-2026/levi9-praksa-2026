import { isApiError } from '@/shared/api/errors'

/** post-service's limits (`PostLimits.java`, `Post.MAX_IMAGES`, `ImageUpload.MAX_BYTES`). */
export const TITLE_MAX = 300
export const CONTENT_MAX = 40_000
export const IMAGES_MAX = 3
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
/** The formats post-service accepts; it checks the file's bytes, not its name. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png'] as const

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

/**
 * What went wrong creating a post. A missing membership is not here: the form handles it with a Join button
 * (`isNotMember`).
 */
export function createErrorMessage(error: unknown): string {
  if (!isApiError(error)) return "Couldn't post. Check your connection and try again."
  switch (error.errorType) {
    case 'COMMUNITY_UNAVAILABLE': return 'This community was shut down, so it takes no new posts.'
    case 'COMMUNITY_SERVICE_UNAVAILABLE': return "Communities can't be checked right now. Try again in a moment."
    case 'TOO_MANY_IMAGES': return `A post can have at most ${IMAGES_MAX} images.`
    case 'UNSUPPORTED_IMAGE_TYPE': return 'One of the images is not a JPEG or PNG.'
    case 'IMAGE_TOO_LARGE': return 'One of the images is over 5 MB.'
  }
  switch (error.status) {
    case 400: return error.errors[0]?.message ?? 'Check the title and text.'
    case 401: return 'Your session ended. Log in again to post.'
    case 413: return 'The images are too large together. Use smaller ones.'
    default: return "Couldn't post. Try again in a moment."
  }
}

/** post-service refused the post because the author hasn't joined the community. */
export function isNotMember(error: unknown): boolean {
  return isApiError(error) && error.status === 403 && error.errorType === 'NOT_COMMUNITY_MEMBER'
}
