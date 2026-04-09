import { describe, it, expect } from 'vitest'
import { Password } from '../Domain/ValueObjects/Password'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'

describe('ScryptPasswordHasher', () => {
  it('負責 hash / verify，Password 只保留 hashed value', async () => {
    const hasher = new ScryptPasswordHasher()
    const hash = await hasher.hash('StrongPass123')

    expect(hash).not.toBe('StrongPass123')
    expect(await hasher.verify(hash, 'StrongPass123')).toBe(true)
    expect(await hasher.verify(hash, 'WrongPass123')).toBe(false)

    const password = Password.fromHashed(hash)
    expect(password.getHashed()).toBe(hash)
  })

  it('應該拒絕弱密碼', async () => {
    const hasher = new ScryptPasswordHasher()
    await expect(hasher.hash('weak')).rejects.toThrow('密碼不符合強度要求')
  })
})
