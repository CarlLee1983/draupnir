/**
 * User 聚合根單元測試
 */

import { describe, it, expect } from 'vitest'
import { User, UserRole, UserStatus } from '../Domain/Aggregates/User'
import { Email } from '../Domain/ValueObjects/Email'

describe('User Aggregate Root', () => {
  it('應該創建新用戶', async () => {
    const email = new Email('user@example.com')
    const user = await User.create('user-id', email, 'StrongPass123')

    expect(user.id).toBe('user-id')
    expect(user.emailValue).toBe('user@example.com')
    expect(user.role).toBe(UserRole.USER)
    expect(user.status).toBe(UserStatus.ACTIVE)
  })

  it('應該驗證正確的密碼', async () => {
    const email = new Email('user@example.com')
    const user = await User.create('user-id', email, 'StrongPass123')

    const isValid = await user.verifyPassword('StrongPass123')
    expect(isValid).toBe(true)
  })

  it('應該拒絕錯誤的密碼', async () => {
    const email = new Email('user@example.com')
    const user = await User.create('user-id', email, 'StrongPass123')

    const isValid = await user.verifyPassword('WrongPassword')
    expect(isValid).toBe(false)
  })

  it('應該改變密碼', async () => {
    const email = new Email('user@example.com')
    const user = await User.create('user-id', email, 'StrongPass123')

    await user.changePassword('NewPass456')

    const isValid = await user.verifyPassword('NewPass456')
    expect(isValid).toBe(true)

    const isOldValid = await user.verifyPassword('StrongPass123')
    expect(isOldValid).toBe(false)
  })

  it('應該暫停用戶', async () => {
    const email = new Email('user@example.com')
    const user = await User.create('user-id', email, 'StrongPass123')

    user.suspend()
    expect(user.status).toBe(UserStatus.SUSPENDED)
    expect(user.isSuspended()).toBe(true)
  })

  it('應該啟用用戶', async () => {
    const email = new Email('user@example.com')
    const user = await User.create('user-id', email, 'StrongPass123')

    user.suspend()
    user.activate()

    expect(user.status).toBe(UserStatus.ACTIVE)
    expect(user.isSuspended()).toBe(false)
  })

  it('應該識別管理員', async () => {
    const email = new Email('admin@example.com')
    const adminUser = await User.create('admin-id', email, 'StrongPass123', UserRole.ADMIN)

    expect(adminUser.isAdmin()).toBe(true)
  })

  it('應該轉換為 DTO（不包含密碼）', async () => {
    const email = new Email('user@example.com')
    const user = await User.create('user-id', email, 'StrongPass123')

    const dto = user.toDTO()

    expect(dto.id).toBe('user-id')
    expect(dto.email).toBe('user@example.com')
    expect(dto.role).toBe(UserRole.USER)
    expect(dto.password).toBeUndefined()
  })

  it('應該從資料庫行重構', async () => {
    const email = new Email('user@example.com')
    const original = await User.create('user-id', email, 'StrongPass123')
    const row = original.toDatabaseRow()

    const reconstructed = User.fromDatabase(row)

    expect(reconstructed.id).toBe(original.id)
    expect(reconstructed.emailValue).toBe(original.emailValue)
    expect(reconstructed.role).toBe(original.role)
  })
})
