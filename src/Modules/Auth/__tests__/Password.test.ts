/**
 * Password 值物件單元測試
 */

import { describe, it, expect } from 'vitest'
import { Password } from '../Domain/ValueObjects/Password'

describe('Password Value Object', () => {
  it('應該創建強密碼', async () => {
    const password = await Password.create('StrongPass123')
    expect(password.getHashed()).toBeTruthy()
  })

  it('應該拒絕弱密碼 - 長度不足', async () => {
    await expect(Password.create('Short1')).rejects.toThrow()
  })

  it('應該拒絕弱密碼 - 缺少大寫字母', async () => {
    await expect(Password.create('weakpass123')).rejects.toThrow()
  })

  it('應該拒絕弱密碼 - 缺少小寫字母', async () => {
    await expect(Password.create('WEAKPASS123')).rejects.toThrow()
  })

  it('應該拒絕弱密碼 - 缺少數字', async () => {
    await expect(Password.create('WeakPassOnly')).rejects.toThrow()
  })

  it('應該驗證正確的密碼', async () => {
    const password = await Password.create('StrongPass123')
    const matches = await password.matches('StrongPass123')
    expect(matches).toBe(true)
  })

  it('應該拒絕錯誤的密碼', async () => {
    const password = await Password.create('StrongPass123')
    const matches = await password.matches('WrongPassword')
    expect(matches).toBe(false)
  })

  it('應該從已加密的密碼重構', async () => {
    const original = await Password.create('StrongPass123')
    const reconstructed = Password.fromHashed(original.getHashed())
    expect(reconstructed.getHashed()).toBe(original.getHashed())
  })
})
