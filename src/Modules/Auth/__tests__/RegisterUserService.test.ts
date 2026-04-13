/**
 * RegisterUserService integration tests.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import { RoleType } from '../Domain/ValueObjects/Role'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('RegisterUserService Integration Test', () => {
  let service: RegisterUserService
  let repository: IAuthRepository

  beforeEach(() => {
    DomainEventDispatcher.resetForTesting()
    const db = new MemoryDatabaseAccess()
    repository = new AuthRepository(db)
    service = new RegisterUserService(repository, new ScryptPasswordHasher())
  })

  it('應該成功註冊新用戶', async () => {
    const result = await service.execute({
      email: 'newuser@example.com',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('User registered successfully')
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
    expect(result.message).toBe('Email already exists')
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
    expect(result.error).toBe('Passwords do not match')
  })

  it('應該拒絕空的電子郵件', async () => {
    const result = await service.execute({
      email: '',
      password: 'StrongPass123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Email is required')
  })

  it('應該拒絕空的密碼', async () => {
    const result = await service.execute({
      email: 'user@example.com',
      password: '',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Password is required')
  })

  it('成功註冊後應發布 UserRegistered 事件', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const capturedEvents: Array<{ userId: string; email: string }> = []

    dispatcher.on('auth.user_registered', async (event) => {
      capturedEvents.push({
        userId: event.data.userId as string,
        email: event.data.email as string,
      })
    })

    await service.execute({
      email: 'newuser@example.com',
      password: 'StrongPass123',
    })

    expect(capturedEvents).toHaveLength(1)
    expect(capturedEvents[0].email).toBe('newuser@example.com')
    expect(capturedEvents[0].userId).toBeTruthy()
  })
})
