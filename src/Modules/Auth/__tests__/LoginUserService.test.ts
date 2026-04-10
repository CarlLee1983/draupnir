/**
 * LoginUserService integration tests.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { UserProfileRepository } from '@/Modules/Profile/Infrastructure/Repositories/UserProfileRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { JwtTokenService } from '../Infrastructure/Services/JwtTokenService'
import { LoginUserService } from '../Application/Services/LoginUserService'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../Domain/Repositories/IAuthTokenRepository'
import { Email } from '../Domain/ValueObjects/Email'
import { RoleType } from '../Domain/ValueObjects/Role'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { AuthTokenRepository } from '../Infrastructure/Repositories/AuthTokenRepository'

describe('LoginUserService Integration Test', () => {
  let registerService: RegisterUserService
  let loginService: LoginUserService
  let repository: IAuthRepository
  let tokenRepository: IAuthTokenRepository
  let jwtTokenService: JwtTokenService

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repository = new AuthRepository(db)
    tokenRepository = new AuthTokenRepository(db)
    jwtTokenService = new JwtTokenService()
    const profileRepo = new UserProfileRepository(db)
    const passwordHasher = new ScryptPasswordHasher()
    registerService = new RegisterUserService(repository, profileRepo, passwordHasher)
    loginService = new LoginUserService(repository, tokenRepository, jwtTokenService, passwordHasher)

    // 建立測試用戶
    await registerService.execute({
      email: 'user@example.com',
      password: 'StrongPass123',
    })
  })

  it('應該成功登入', async () => {
    const result = await loginService.execute({
      email: 'user@example.com',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('登入成功')
    expect(result.data?.accessToken).toBeTruthy()
    expect(result.data?.refreshToken).toBeTruthy()
    expect(result.data?.user.email).toBe('user@example.com')
    expect(result.data?.user.role).toBe(RoleType.MEMBER)

    const payload = jwtTokenService.verify(result.data!.accessToken)
    expect(payload?.role).toBe(RoleType.MEMBER)
  })

  it('應該拒絕不存在的用戶', async () => {
    const result = await loginService.execute({
      email: 'nonexistent@example.com',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('電子郵件或密碼錯誤')
  })

  it('應該拒絕錯誤的密碼', async () => {
    const result = await loginService.execute({
      email: 'user@example.com',
      password: 'WrongPassword',
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('電子郵件或密碼錯誤')
  })

  it('應該拒絕空的電子郵件', async () => {
    const result = await loginService.execute({
      email: '',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('電子郵件不能為空')
  })

  it('應該拒絕空的密碼', async () => {
    const result = await loginService.execute({
      email: 'user@example.com',
      password: '',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('密碼不能為空')
  })

  it('應該拒絕被暫停的用戶登入', async () => {
    // 暫停用戶
    const user = await repository.findByEmail(new Email('user@example.com'))
    if (user) {
      user.suspend()
      await repository.save(user)
    }

    const result = await loginService.execute({
      email: 'user@example.com',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('此帳戶已被暫停')
  })
})
