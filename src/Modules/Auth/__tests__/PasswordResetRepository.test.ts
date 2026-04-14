import { describe, expect, it } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { PasswordResetRepository } from '../Infrastructure/Repositories/PasswordResetRepository'

describe('PasswordResetRepository', () => {
  it('建立、查詢並標記已使用', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new PasswordResetRepository(db)

    const created = await repo.create('user@example.com')
    expect(created.email).toBe('user@example.com')
    expect(created.used).toBe(false)
    expect(created.isValid()).toBe(true)

    const found = await repo.findByToken(created.token)
    expect(found?.email).toBe('user@example.com')
    expect(found?.used).toBe(false)

    await repo.markUsed(created.token)
    const after = await repo.findByToken(created.token)
    expect(after?.used).toBe(true)
    expect(after?.isValid()).toBe(false)
  })

  it('找不到 token 時回傳 null', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new PasswordResetRepository(db)
    expect(await repo.findByToken('missing')).toBeNull()
  })
})
