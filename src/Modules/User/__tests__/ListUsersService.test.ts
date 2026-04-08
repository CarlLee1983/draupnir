import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ListUsersService } from '../Application/Services/ListUsersService'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'
import { UserProfile } from '../Domain/Aggregates/UserProfile'

describe('ListUsersService', () => {
  let service: ListUsersService
  let repo: UserProfileRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    service = new ListUsersService(repo)

    // 建立 3 個 Profile
    await repo.save(UserProfile.createDefault('user-1', 'alice@example.com'))
    await repo.save(UserProfile.createDefault('user-2', 'bob@example.com'))
    await repo.save(UserProfile.createDefault('user-3', 'charlie@example.com'))
  })

  it('應回傳所有使用者（分頁）', async () => {
    const result = await service.execute({})
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(3)
    expect(result.data?.meta.total).toBe(3)
  })

  it('應支援分頁', async () => {
    const result = await service.execute({ page: 1, limit: 2 })
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(2)
    expect(result.data?.meta.totalPages).toBe(2)
  })

  it('應支援關鍵字搜尋', async () => {
    const result = await service.execute({ keyword: 'alice' })
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(1)
  })
})
