/**
 * RegisterUserService integration tests.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { UserProfileRepository } from '@/Modules/Profile/Infrastructure/Repositories/UserProfileRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import { RoleType } from '../Domain/ValueObjects/Role'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'

describe('RegisterUserService Integration Test', () => {
  let service: RegisterUserService
  let repository: IAuthRepository

  beforeEach(() => {
    const db = new MemoryDatabaseAccess()
    repository = new AuthRepository(db)
    const profileRepo = new UserProfileRepository(db)
    service = new RegisterUserService(repository, profileRepo, new ScryptPasswordHasher())
  })

  it('應該成功註冊新用戶', async () => {
    const result = await service.execute({
      email: 'newuser@example.com',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('用戶註冊成功')
    expect(result.data?.id).toBeTruthy()
    expect(result.data?.email).toBe('newuser@example.com')
    expect(result.data?.role).toBe(RoleType.MEMBER)
  })

  it('應該拒絕已存在的電子郵件', async () => {
    // 第一次註冊
    await service.execute({
      email: 'existing@example.com',
      password: 'StrongPass123',
    })

    // 第二次使用相同電子郵件
    const result = await service.execute({
      email: 'existing@example.com',
      password: 'StrongPass456',
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('此電子郵件已被註冊')
  })

  it('應該驗證密碼強度', async () => {
    const result = await service.execute({
      email: 'user@example.com',
      password: 'weak',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('應該驗證密碼是否匹配', async () => {
    const result = await service.execute({
      email: 'user@example.com',
      password: 'StrongPass123',
      confirmPassword: 'DifferentPass456',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('密碼不匹配')
  })

  it('應該拒絕空的電子郵件', async () => {
    const result = await service.execute({
      email: '',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('電子郵件不能為空')
  })

  it('應該拒絕空的密碼', async () => {
    const result = await service.execute({
      email: 'user@example.com',
      password: '',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('密碼不能為空')
  })
})
