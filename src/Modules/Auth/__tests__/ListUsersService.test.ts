import { beforeEach, describe, expect, it } from 'vitest'
import { UserProfileRepository } from '@/Modules/Profile/Infrastructure/Repositories/UserProfileRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ListUsersService } from '../Application/Services/ListUsersService'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import { User, UserStatus } from '../Domain/Aggregates/User'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import { Email } from '../Domain/ValueObjects/Email'
import { Password } from '../Domain/ValueObjects/Password'
import { Role } from '../Domain/ValueObjects/Role'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'

describe('ListUsersService', () => {
  let service: ListUsersService
  let authRepo: IAuthRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    authRepo = new AuthRepository(db)
    const profileRepo = new UserProfileRepository(db)
    service = new ListUsersService(authRepo, profileRepo)

    const registerService = new RegisterUserService(
      authRepo,
      profileRepo,
      new ScryptPasswordHasher(),
    )
    await registerService.execute({ email: 'alice@example.com', password: 'StrongPass123' })
    await registerService.execute({ email: 'bob@example.com', password: 'StrongPass123' })
    await registerService.execute({ email: 'charlie@example.com', password: 'StrongPass123' })

    const users = await authRepo.findAll()
    const adminUser = User.reconstitute({
      id: users[0].id,
      email: new Email(users[0].emailValue),
      password: Password.fromHashed(users[0].password.getHashed()),
      role: Role.admin(),
      status: UserStatus.ACTIVE,
      googleId: users[0].googleId,
      createdAt: users[0].createdAt,
      updatedAt: users[0].updatedAt,
    })
    await authRepo.save(adminUser)

    const suspended = await authRepo.findById(users[1].id)
    if (suspended) await authRepo.save(suspended.suspend())

    const profiles = await profileRepo.findAll()
    const charlieProfile = profiles.find((p) => p.id === users[2].id)
    if (charlieProfile) {
      await profileRepo.update(charlieProfile.updateProfile({ displayName: 'Charlie Zhao' }))
    }
  })

  it('應回傳所有使用者（分頁）', async () => {
    const result = await service.execute({})
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(3)
    expect(result.data?.meta.total).toBe(3)
  })

  it('應支援角色篩選', async () => {
    const result = await service.execute({ role: 'admin' })
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(1)
    expect(result.data?.users[0]?.role).toBe('admin')
  })

  it('應支援狀態與關鍵字搜尋', async () => {
    const result = await service.execute({ status: 'suspended', keyword: 'bob' })
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(1)
    expect(result.data?.users[0]?.email).toBe('bob@example.com')
  })

  it('應支援分頁', async () => {
    const result = await service.execute({ page: 1, limit: 2 })
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(2)
    expect(result.data?.meta.totalPages).toBe(2)
  })
})
