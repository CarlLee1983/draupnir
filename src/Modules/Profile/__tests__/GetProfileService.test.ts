import { beforeEach, describe, expect, it } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetProfileService } from '../Application/Services/GetProfileService'
import { UserProfile } from '../Domain/Aggregates/UserProfile'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'

describe('GetProfileService', () => {
  let service: GetProfileService
  let repo: UserProfileRepository
  let profileId: string

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    service = new GetProfileService(repo)

    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    profileId = profile.id
    await repo.save(profile)
  })

  it('應成功取得 Profile', async () => {
    const result = await service.execute(profileId)
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe(profileId)
    expect(result.data?.displayName).toBe('user@example.com')
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await service.execute('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('PROFILE_NOT_FOUND')
  })
})
