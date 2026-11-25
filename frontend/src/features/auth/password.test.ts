import { describe, expect, it } from 'vitest'
import { checkPassword, utf8Bytes } from './password'
import { estimatePassword } from './password-strength'

describe('checkPassword', () => {
  it('keeps acceptance independent of the advisory strength', () => {
    expect(checkPassword('')).toEqual({ longEnough: false, fitsLimit: true })
    expect(checkPassword('Sh0rt!pass1').longEnough).toBe(false)
    expect(checkPassword('twelve chars').longEnough).toBe(true)
    expect(checkPassword('a'.repeat(24))).toEqual({ longEnough: true, fitsLimit: true })
  })

  it('enforces the 72-byte boundary in UTF-8', () => {
    expect(utf8Bytes('ć')).toBe(2)
    expect(checkPassword('a'.repeat(72)).fitsLimit).toBe(true)
    expect(checkPassword('a'.repeat(73)).fitsLimit).toBe(false)
    expect(checkPassword('ć'.repeat(36)).fitsLimit).toBe(true)
    expect(checkPassword('ć'.repeat(37)).fitsLimit).toBe(false)
    expect(checkPassword('😀'.repeat(18)).fitsLimit).toBe(true)
    expect(checkPassword('😀'.repeat(19)).fitsLimit).toBe(false)
  })
})

describe('estimatePassword', () => {
  it.each([
    'aaaaaaaaaaaaaaaaaaaaaaaa',
    'abcdefabcdefabcdefabcdef',
    'qwertyuiop123456',
    '12345678901234567890',
    'Password123!',
    'P@ssw0rd123!',
    'passwordpasswordpassword',
  ])('recognizes predictable password %s as weak', password => {
    expect(estimatePassword(password).strength).toBeLessThanOrEqual(1)
  })

  it.each(['lozinka', 'parola', 'wachtwoord'])('recognizes regional dictionary word %s', password => {
    expect(estimatePassword(password).strength).toBeLessThanOrEqual(1)
  })

  it('rates generated passwords and unrelated passphrase words highly', () => {
    expect(estimatePassword('v8#Rk2!mZ9$qL5@t').strength).toBe(4)
    expect(estimatePassword('otter lantern velvet glacier').strength).toBe(4)
  })

  it('rates an exact match to a long username as very weak', () => {
    const username = 'nekijakodobarusernameovde'
    expect(estimatePassword(username, [username]).strength).toBe(0)
  })

  it('uses current personal information without retaining it for later checks', () => {
    const password = 'Zorvathen2026!'
    const baseline = estimatePassword(password).strength
    expect(estimatePassword(password, ['Zorvathen']).strength).toBeLessThan(baseline)
    expect(estimatePassword(password, ['zorvathen@example.com']).strength).toBeLessThan(baseline)
    expect(estimatePassword(password).strength).toBe(baseline)
  })

  it('returns actionable English feedback for weak passwords', () => {
    const result = estimatePassword('aaaaaaaaaaaaaaaaaaaaaaaa')
    expect(result.warning).toMatch(/repeat/i)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })
})
