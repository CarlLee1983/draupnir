import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { UpdateUserProfileService } from '../Application/Services/UpdateUserProfileService'
import { GetUserProfileService } from '../Application/Services/GetUserProfileService'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'
import { UserProfile } from '../Domain/Aggregates/UserProfile'

describe('UpdateUserProfileService', () => {
  let updateService: UpdateUserProfileService
  let getService: GetUserProfileService
  let repo: UserProfileRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    updateService = new UpdateUserProfileService(repo)
    getService = new GetUserProfileService(repo)

    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    await repo.save(profile)
  })

  it('應成功更新 displayName', async () => {
    const result = await updateService.execute('user-123', { displayName: '新名稱' })
    expect(result.success).toBe(true)

    const profile = await getService.execute('user-123')
    expect(profile.data?.displayName).toBe('新名稱')
  })

  it('應成功部分更新', async () => {
    await updateService.execute('user-123', { bio: '個人簡介', timezone: 'Asia/Tokyo' })
    const profile = await getService.execute('user-123')
    expect(profile.data?.bio).toBe('個人簡介')
    expect(profile.data?.timezone).toBe('Asia/Tokyo')
    expect(profile.data?.displayName).toBe('user@example.com') // 未更新的欄位保持原值
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await updateService.execute('nonexistent', { displayName: 'test' })
    expect(result.success).toBe(false)
  })

  it('無效的電話號碼應回傳錯誤', async () => {
    const result = await updateService.execute('user-123', { phone: '123' })
    expect(result.success).toBe(false)
  })
})
