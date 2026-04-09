/**
 * User 聚合根單元測試
 */

import { describe, it, expect } from 'vitest'
import { User, UserStatus } from '../Domain/Aggregates/User'
import { Email } from '../Domain/ValueObjects/Email'
import { Password } from '../Domain/ValueObjects/Password'
import { Role, RoleType } from '../Domain/ValueObjects/Role'

describe('User Aggregate Root', () => {
  it('應該創建新用戶並預設為 MEMBER 角色', () => {
    const email = new Email('user@example.com')
    const user = User.create('user-id', email, Password.fromHashed('salt:hash'))

    expect(user.id).toBe('user-id')
    expect(user.emailValue).toBe('user@example.com')
    expect(user.role.getValue()).toBe(RoleType.MEMBER)
    expect(user.role.isMember()).toBe(true)
    expect(user.status).toBe(UserStatus.ACTIVE)
  })

  it('應該識別管理員', () => {
    const email = new Email('admin@example.com')
    const user = User.create(
      'admin-id',
      email,
      Password.fromHashed('salt:hash'),
      Role.admin(),
    )

    expect(user.isAdmin()).toBe(true)
  })

  it('應該暫停與啟用用戶', () => {
    const email = new Email('user@example.com')
    const user = User.create('user-id', email, Password.fromHashed('salt:hash'))

    user.suspend()
    expect(user.status).toBe(UserStatus.SUSPENDED)
    expect(user.isSuspended()).toBe(true)

    user.activate()
    expect(user.status).toBe(UserStatus.ACTIVE)
    expect(user.isSuspended()).toBe(false)
  })

  it('應該從 domain props 重構', () => {
    const email = new Email('user@example.com')
    const user = User.reconstitute({
      id: 'user-id',
      email,
      password: Password.fromHashed('salt:hash'),
      role: Role.member(),
      status: UserStatus.INACTIVE,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    })

    expect(user.id).toBe('user-id')
    expect(user.emailValue).toBe('user@example.com')
    expect(user.role.getValue()).toBe(RoleType.MEMBER)
    expect(user.status).toBe(UserStatus.INACTIVE)
  })
})
