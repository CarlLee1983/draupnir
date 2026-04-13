import { beforeEach, describe, expect, it } from 'vitest'
import { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import { AppModuleRepository } from '@/Modules/AppModule/Infrastructure/Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '@/Modules/AppModule/Infrastructure/Repositories/ModuleSubscriptionRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { ScryptPasswordHasher } from '@/Modules/Auth/Infrastructure/Services/PasswordHasher'
import { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'
import { UserProfileRepository } from '@/Modules/Profile/Infrastructure/Repositories/UserProfileRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'

describe('CreateOrganizationService', () => {
  let service: CreateOrganizationService
  let db: MemoryDatabaseAccess
  let managerId: string

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const profileRepo = new UserProfileRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    service = new CreateOrganizationService(
      orgRepo,
      memberRepo,
      authRepo,
      db,
      new ProvisionOrganizationDefaultsService(
        new AppModuleRepository(db),
        new ContractRepository(db),
        new ModuleSubscriptionRepository(db),
      ),
    )

    const registerService = new RegisterUserService(
      authRepo,
      profileRepo,
      new ScryptPasswordHasher(),
    )
    const result = await registerService.execute({
      email: 'manager@example.com',
      password: 'StrongPass123',
    })
    managerId = result.data!.id
  })

  it('應成功建立 Organization 並指定 Manager', async () => {
    const result = await service.execute({
      name: 'CMG 科技',
      description: '科技公司',
      managerUserId: managerId,
    })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('CMG 科技')
    expect(result.data?.slug).toBeTruthy()
  })

  it('不存在的 Manager 應回傳錯誤', async () => {
    const result = await service.execute({
      name: 'Test Org',
      managerUserId: 'nonexistent',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MANAGER_NOT_FOUND')
  })

  it('空名稱應回傳錯誤', async () => {
    const result = await service.execute({
      name: '',
      managerUserId: managerId,
    })
    expect(result.success).toBe(false)
  })

  it('重複的 slug 應回傳錯誤', async () => {
    await service.execute({ name: 'CMG', managerUserId: managerId })
    const authRepo = new AuthRepository(db)
    const profileRepo = new UserProfileRepository(db)
    const registerService = new RegisterUserService(
      authRepo,
      profileRepo,
      new ScryptPasswordHasher(),
    )
    const result2 = await registerService.execute({
      email: 'manager2@example.com',
      password: 'StrongPass123',
    })
    const result = await service.execute({
      name: 'CMG',
      slug: 'cmg',
      managerUserId: result2.data!.id,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('SLUG_EXISTS')
  })
})
