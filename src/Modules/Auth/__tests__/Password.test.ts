/**
 * Password 值物件單元測試
 */

import { describe, it, expect } from 'vitest'
import { Password } from '../Domain/ValueObjects/Password'

describe('Password Value Object', () => {
  it('只應保留雜湊值', () => {
    const password = Password.fromHashed('salt:hash')

    expect(password.getHashed()).toBe('salt:hash')
    expect(password.toString()).toBe('salt:hash')
  })

  it('應該拒絕空的雜湊值', () => {
    expect(() => Password.fromHashed('')).toThrow('無效的密碼雜湊')
  })
})
