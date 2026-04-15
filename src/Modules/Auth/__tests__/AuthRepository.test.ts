import { describe, expect, it } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { User, UserStatus } from '../Domain/Aggregates/User'
import { Email } from '../Domain/ValueObjects/Email'
import { Password } from '../Domain/ValueObjects/Password'
import { Role, RoleType } from '../Domain/ValueObjects/Role'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'

describe('AuthRepository', () => {
  it('負責 DB row 與 domain object 的 mapping，而不是由 User aggregate 提供', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new AuthRepository(db)
    const hasher = new ScryptPasswordHasher()
    const password = Password.fromHashed(await hasher.hash('StrongPass123'))
    const user = User.create('u-1', new Email('user@example.com'), password, Role.member())

    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(user))).not.toContain('toDatabaseRow')
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(user))).not.toContain('toDTO')

    await repo.save(user)
    const restored = await repo.findById('u-1')

    expect(restored?.emailValue).toBe('user@example.com')
    expect(restored?.role.getValue()).toBe(RoleType.MEMBER)
    expect(restored?.status).toBe(UserStatus.ACTIVE)
    expect(restored?.password.getHashed()).toBe(password.getHashed())
  })

  it('會把舊的 user / guest 角色映射回 member', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new AuthRepository(db)

    await db.table('users').insert({
      id: 'legacy-1',
      email: 'legacy@example.com',
      password: 'legacy-salt:legacy-hash',
      role: 'user',
      status: 'active',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    })

    const restored = await repo.findById('legacy-1')
    expect(restored?.role.getValue()).toBe(RoleType.MEMBER)
  })

  it('updateRole 應更新 users.role 欄位', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new AuthRepository(db)
    const hasher = new ScryptPasswordHasher()
    const password = Password.fromHashed(await hasher.hash('StrongPass123'))
    const user = User.create('u-role', new Email('role@example.com'), password, Role.member())
    await repo.save(user)

    await repo.updateRole('u-role', RoleType.MANAGER)
    const updated = await repo.findById('u-role')
    expect(updated?.role.getValue()).toBe(RoleType.MANAGER)
  })
})
