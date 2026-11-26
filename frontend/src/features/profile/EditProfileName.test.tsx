import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NAME_MAX_LENGTH } from '@/shared/api/contracts/auth'
import { EditProfileName } from './EditProfileName'
import { checkName } from './validateName'

describe('EditProfileName', () => {
  it('shows the display name, the username and the edit button', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <EditProfileName username="demo_user" firstName="Demo" lastName="User" />
      </QueryClientProvider>,
    )
    expect(html).toContain('Demo User')
    expect(html).toContain('u/demo_user')
    expect(html).toContain('aria-label="Edit name"')
    expect(html).not.toContain('First name')
  })

  it('validates the two fields before saving', () => {
    expect(checkName('  Ada  ', 'First name')).toBeUndefined()
    expect(checkName('  ', 'First name')).toBe('First name is required')
    expect(checkName('x'.repeat(NAME_MAX_LENGTH + 1), 'Last name')).toBe(`Use at most ${NAME_MAX_LENGTH} characters`)
  })
})
