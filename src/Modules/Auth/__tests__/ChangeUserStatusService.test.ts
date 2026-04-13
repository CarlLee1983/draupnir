import { beforeEach, describe, expect, it } from 'vitest'
import { UserProfileRepository } from '@/Modules/Profile/Infrastructure/Repositories/UserProfileRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ChangeUserStatusService } from '../Application/Services/ChangeUserStatusService'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../Domain/Repositories/IAuthTokenRepository'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { AuthTokenRepository } from '../Infrastructure/Repositories/AuthTokenRepository'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'

describe('ChangeUserStatusService', () => {
  let service: ChangeUserStatusService
  let authRepo: IAuthRepository
  let authTokenRepo: IAuthTokenRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    authRepo = new AuthRepository(db)
    authTokenRepo = new AuthTokenRepository(db)
    service = new ChangeUserStatusService(authRepo, authTokenRepo)

    const profileRepo = new UserProfileRepository(db)
    const registerService = new RegisterUserService(
      authRepo,
      profileRepo,
      new ScryptPasswordHasher(),
    )
    await registerService.execute({ email: 'user@example.com', password: 'StrongPass123' })
  })

  it('應成功停用帳戶', async () => {
    const users = await authRepo.findAll()
    const userId = users[0].id

    const result = await service.execute(userId, { status: 'suspended' })
    expect(result.success).toBe(true)

    const user = await authRepo.findById(userId)
    expect(user?.isSuspended()).toBe(true)
  })

  it('應成功啟用帳戶', async () => {
    const users = await authRepo.findAll()
    const userId = users[0].id

    await service.execute(userId, { status: 'suspended' })
    const result = await service.execute(userId, { status: 'active' })
    expect(result.success).toBe(true)

    const user = await authRepo.findById(userId)
    expect(user?.isSuspended()).toBe(false)
  })

  it('不存在的使用者應回傳錯誤', async () => {
    const result = await service.execute('nonexistent', { status: 'suspended' })
    expect(result.success).toBe(false)
  })
})
