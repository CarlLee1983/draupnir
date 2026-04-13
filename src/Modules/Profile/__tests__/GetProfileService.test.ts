import { beforeEach, describe, expect, it } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetProfileService } from '../Application/Services/GetProfileService'
import { UserProfile } from '../Domain/Aggregates/UserProfile'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'

describe('GetProfileService', () => {
  let service: GetProfileService
  let repo: UserProfileRepository
  const userId = 'user-123'

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    service = new GetProfileService(repo)

    const profile = UserProfile.createDefault(userId, 'user@example.com')
    await repo.save(profile)
  })

  it('應成功取得 Profile', async () => {
    const result = await service.execute(userId)
    expect(result.success).toBe(true)
    expect(result.data?.displayName).toBe('user@example.com')
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await service.execute('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('PROFILE_NOT_FOUND')
  })
})
