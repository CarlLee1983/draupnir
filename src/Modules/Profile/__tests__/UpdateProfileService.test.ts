import { beforeEach, describe, expect, it } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetProfileService } from '../Application/Services/GetProfileService'
import { UpdateProfileService } from '../Application/Services/UpdateProfileService'
import { UserProfile } from '../Domain/Aggregates/UserProfile'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'

describe('UpdateProfileService', () => {
  let updateService: UpdateProfileService
  let getService: GetProfileService
  let repo: UserProfileRepository
  let profileId: string

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    updateService = new UpdateProfileService(repo)
    getService = new GetProfileService(repo)

    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    profileId = profile.id
    await repo.save(profile)
  })

  it('應成功更新 displayName', async () => {
    const result = await updateService.execute(profileId, { displayName: '新名稱' })
    expect(result.success).toBe(true)

    const profile = await getService.execute(profileId)
    expect(profile.data?.displayName).toBe('新名稱')
  })

  it('應成功部分更新', async () => {
    await updateService.execute(profileId, { bio: '個人簡介', timezone: 'Asia/Tokyo' })
    const profile = await getService.execute(profileId)
    expect(profile.data?.bio).toBe('個人簡介')
    expect(profile.data?.timezone).toBe('Asia/Tokyo')
    expect(profile.data?.displayName).toBe('user@example.com') // 未更新的欄位保持原值
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await updateService.execute('nonexistent', { displayName: 'test' })
    expect(result.success).toBe(false)
  })

  it('無效的電話號碼應回傳錯誤', async () => {
    const result = await updateService.execute(profileId, { phone: '123' })
    expect(result.success).toBe(false)
  })
})
