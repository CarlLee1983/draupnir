import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ChangeUserStatusService } from '../Application/Services/ChangeUserStatusService'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { AuthTokenRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'

describe('ChangeUserStatusService', () => {
  let service: ChangeUserStatusService
  let authRepo: IAuthRepository
  let authTokenRepo: IAuthTokenRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    authRepo = new AuthRepository(db)
    authTokenRepo = new AuthTokenRepository(db)
    service = new ChangeUserStatusService(authRepo, authTokenRepo)

    const registerService = new RegisterUserService(authRepo)
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

    // 先停用
    await service.execute(userId, { status: 'suspended' })
    // 再啟用
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
