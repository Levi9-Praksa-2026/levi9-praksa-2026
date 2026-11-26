import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { createErrorMessage, isNotMember, removeErrorMessage, saveErrorMessage } from './messages'

const error = (status: number, errors?: { field: string; message: string }[], errorType?: string) =>
  new ApiError({ status, errors, errorType })

describe('post messages', () => {
  it('names the reason an edit was refused', () => {
    expect(saveErrorMessage(error(403))).toBe('Only the author can edit this post.')
    expect(saveErrorMessage(error(404))).toBe('This post was removed meanwhile.')
    expect(saveErrorMessage(error(400, [{ field: 'title', message: 'must not be blank' }]))).toBe('must not be blank')
    expect(saveErrorMessage(new TypeError('Failed to fetch'))).toContain('Check your connection')
  })

  it('names the reason a removal was refused', () => {
    expect(removeErrorMessage(error(403))).toBe('Only the author or an admin can remove this post.')
    expect(removeErrorMessage(error(401))).toContain('Log in again')
  })

  it('names the reason a new post was refused, from the error type first', () => {
    expect(createErrorMessage(error(422, undefined, 'COMMUNITY_UNAVAILABLE'))).toContain('shut down')
    expect(createErrorMessage(error(422, undefined, 'UNSUPPORTED_IMAGE_TYPE'))).toBe('One of the images is not a JPEG or PNG.')
    expect(createErrorMessage(error(413))).toContain('too large')
  })

  it('tells a missing membership apart from other refusals', () => {
    expect(isNotMember(error(403, undefined, 'NOT_COMMUNITY_MEMBER'))).toBe(true)
    expect(isNotMember(error(403))).toBe(false)
  })
})
