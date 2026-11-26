import { isApiError } from '@/shared/api/errors'

export function adminError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) return 'Your session has ended. Log in again to continue.'
    if (error.status === 403) return error.problem.detail ?? 'You do not have permission to perform this action.'
    if (error.errors.length) return error.errors.map(field => `${field.field}: ${field.message}`).join('. ')
    if (error.status === 404) return 'The requested resource was not found, or your admin access is no longer available.'
    return error.problem.detail ?? 'The request failed. Please try again.'
  }
  return 'Could not reach the service. Check your connection and try again.'
}

