import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { removeErrorMessage, saveErrorMessage } from './messages'

const error = (status: number, errors?: { field: string; message: string }[]) => new ApiError({ status, errors })

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
})
