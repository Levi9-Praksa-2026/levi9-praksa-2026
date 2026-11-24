import { describe, expect, it } from 'vitest'
import { checkPassword, utf8Bytes } from './password'

describe('checkPassword', () => {
  it('needs 12 characters before it has any strength', () => {
    expect(checkPassword('')).toEqual({ longEnough: false, fitsLimit: true, strength: 0 })
    expect(checkPassword('Sh0rt!pass1').strength).toBe(0)
    expect(checkPassword('twelve chars').longEnough).toBe(true)
  })

  it('counts length most, and mixing kinds a little', () => {
    expect(checkPassword('lowercaseonly').strength).toBe(1)
    expect(checkPassword('Lowercase0nly').strength).toBe(2)
    expect(checkPassword('a longer passphrase').strength).toBe(2)
    expect(checkPassword('a much longer passphrase').strength).toBe(3)
    expect(checkPassword('A much longer passphrase 9').strength).toBe(4)
  })

  it('calls a repeated pattern weak, however long', () => {
    expect(checkPassword('aaaaaaaaaaaaaaaaaaaaaaaa').strength).toBe(1)
    expect(checkPassword('abababababababababababab').strength).toBe(1)
  })

  it('refuses more than 72 bytes, counting UTF-8 like BCrypt', () => {
    expect(utf8Bytes('ć')).toBe(2)
    expect(checkPassword('a'.repeat(72)).fitsLimit).toBe(true)
    expect(checkPassword('a'.repeat(73)).fitsLimit).toBe(false)
    expect(checkPassword('ć'.repeat(37)).fitsLimit).toBe(false) // 37 characters, 74 bytes
  })
})
