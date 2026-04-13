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
  const userId = 'user-123'

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    updateService = new UpdateProfileService(repo)
    getService = new GetProfileService(repo)

    const profile = UserProfile.createDefault(userId, 'user@example.com')
    await repo.save(profile)
  })

  it('應成功更新 displayName', async () => {
    const result = await updateService.execute(userId, { displayName: '新名稱' })
    expect(result.success).toBe(true)

    const profile = await getService.execute(userId)
    expect(profile.data?.displayName).toBe('新名稱')
  })

  it('應成功部分更新', async () => {
    await updateService.execute(userId, { bio: '個人簡介', timezone: 'Asia/Tokyo' })
    const profile = await getService.execute(userId)
    expect(profile.data?.bio).toBe('個人簡介')
    expect(profile.data?.timezone).toBe('Asia/Tokyo')
    expect(profile.data?.displayName).toBe('user@example.com') // 未更新的欄位保持原值
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await updateService.execute('nonexistent', { displayName: 'test' })
    expect(result.success).toBe(false)
  })

  it('無效的電話號碼應回傳錯誤', async () => {
    const result = await updateService.execute(userId, { phone: '123' })
    expect(result.success).toBe(false)
  })
})
