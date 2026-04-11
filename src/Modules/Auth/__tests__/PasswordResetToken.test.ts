import { describe, expect, test } from 'bun:test'
import { PasswordResetToken } from '../Domain/ValueObjects/PasswordResetToken'

describe('PasswordResetToken', () => {
  test('creates token with required properties', () => {
    const token = PasswordResetToken.create('user@example.com')
    expect(token.token).toBeDefined()
    expect(token.token.length).toBe(64)
    expect(token.email).toBe('user@example.com')
    expect(token.used).toBe(false)
    expect(token.isExpired()).toBe(false)
    expect(token.isValid()).toBe(true)
  })

  test('isExpired returns true for past expiry', () => {
    const pastDate = new Date(Date.now() - 1000)
    const token = PasswordResetToken.reconstruct('abc', 'e@e.com', pastDate, false)
    expect(token.isExpired()).toBe(true)
    expect(token.isValid()).toBe(false)
  })

  test('isValid returns false when used', () => {
    const futureDate = new Date(Date.now() + 3600000)
    const token = PasswordResetToken.reconstruct('abc', 'e@e.com', futureDate, true)
    expect(token.isValid()).toBe(false)
  })

  test('markUsed returns new token with used=true', () => {
    const token = PasswordResetToken.create('e@e.com')
    const used = token.markUsed()
    expect(used.used).toBe(true)
    expect(token.used).toBe(false)
  })
})
