import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PasswordStrength from './PasswordStrength'

function render(password: string, userInputs?: string[]) {
  return renderToStaticMarkup(<PasswordStrength id="strength" password={password} userInputs={userInputs} />)
}

describe('PasswordStrength', () => {
  it('shows a weak label and English advice for a valid but predictable password', () => {
    const html = render('aaaaaaaaaaaaaaaaaaaaaaaa')
    expect(html).toContain('Very weak')
    expect(html).toContain('Repeated characters')
    expect(html).not.toContain('Too short')
    expect(html).toContain('aria-live="polite"')
  })

  it('shows length violations separately from strength', () => {
    expect(render('x')).toContain('Too short')
    expect(render('x'.repeat(73))).toContain('Too long')
    expect(render('😀'.repeat(19))).toContain('Too long')
  })

  it('fills all four segments for a strong password', () => {
    const html = render('v8#Rk2!mZ9$qL5@t')
    expect(html).toContain('Strong')
    expect(html.match(/bg-accent/g)).toHaveLength(4)
  })

  it('shows very weak when the password equals the long username', () => {
    const username = 'nekijakodobarusernameovde'
    const html = render(username, [username])
    expect(html).toContain('Very weak')
    expect(html).not.toContain('bg-accent')
  })

  it('uses supplied registration details', () => {
    expect(render('Zorvathen2026!', ['Zorvathen'])).not.toContain('Strong')
  })

  it('leaves an empty password unlabeled', () => {
    const html = render('')
    expect(html).not.toMatch(/Very weak|Too short|Strong/)
    expect(html).not.toContain('<p')
  })
})
