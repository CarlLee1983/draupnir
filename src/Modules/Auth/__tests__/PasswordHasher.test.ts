import { describe, expect, it } from 'vitest'
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
    await expect(hasher.hash('weak')).rejects.toThrow(
      'Password does not meet strength requirements',
    )
  })

  it('應能驗證歷史 scrypt 格式（與舊 scryptSync 預設參數相同之固定向量）', async () => {
    // 以固定鹽 + Node 預設 scrypt(64) 產生；免於在測試內匯入 node:crypto（banned-imports 白名單外）
    const legacy =
      '00112233445566778899aabbccddeeff:41f62e5e7c54b9a781880b1841b3c50160db78640e71862c5d58e89f98db62bad798a750982a0e46c92d9c137ff3945b048a1a72b1a08bb49196525ded555016'
    const hasher = new ScryptPasswordHasher()
    expect(await hasher.verify(legacy, 'StrongPass123')).toBe(true)
    expect(await hasher.verify(legacy, 'WrongPass123')).toBe(false)
  })
})
