import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetUserProfileService } from '../Application/Services/GetUserProfileService'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'
import { UserProfile } from '../Domain/Aggregates/UserProfile'

describe('GetUserProfileService', () => {
  let service: GetUserProfileService
  let repo: UserProfileRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    service = new GetUserProfileService(repo)

    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    await repo.save(profile)
  })

  it('應成功取得 Profile', async () => {
    const result = await service.execute('user-123')
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('user-123')
    expect(result.data?.displayName).toBe('user@example.com')
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await service.execute('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('PROFILE_NOT_FOUND')
  })
})
