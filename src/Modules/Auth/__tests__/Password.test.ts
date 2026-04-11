/**
 * Password value object unit tests.
 */

import { describe, expect, it } from 'vitest'
import { Password } from '../Domain/ValueObjects/Password'

describe('Password Value Object', () => {
  it('只應保留雜湊值', () => {
    const password = Password.fromHashed('salt:hash')

    expect(password.getHashed()).toBe('salt:hash')
    expect(password.toString()).toBe('salt:hash')
  })

  it('應該拒絕空的雜湊值', () => {
    expect(() => Password.fromHashed('')).toThrow('Invalid password hash')
  })
})
