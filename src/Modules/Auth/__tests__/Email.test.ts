/**
 * Email value object unit tests.
 */

import { describe, expect, it } from 'vitest'
import { Email } from '../Domain/ValueObjects/Email'

describe('Email Value Object', () => {
  it('應該創建有效的 Email 物件', () => {
    const email = new Email('user@example.com')
    expect(email.getValue()).toBe('user@example.com')
  })

  it('應該將電子郵件轉換為小寫', () => {
    const email = new Email('User@EXAMPLE.COM')
    expect(email.getValue()).toBe('user@example.com')
  })

  it('應該拋出例外 - 無效的電子郵件格式', () => {
    expect(() => new Email('invalid-email')).toThrow()
    expect(() => new Email('user@')).toThrow()
    expect(() => new Email('@example.com')).toThrow()
  })

  it('應該比較兩個 Email 物件', () => {
    const email1 = new Email('user@example.com')
    const email2 = new Email('user@example.com')
    const email3 = new Email('other@example.com')

    expect(email1.equals(email2)).toBe(true)
    expect(email1.equals(email3)).toBe(false)
  })

  it('應該將電子郵件轉換為字符串', () => {
    const email = new Email('user@example.com')
    expect(email.toString()).toBe('user@example.com')
  })

  it('應該拒絕過長的電子郵件', () => {
    const longEmail = `${'a'.repeat(250)}@example.com`
    expect(() => new Email(longEmail)).toThrow()
  })
})
