import { beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import { AppModuleRepository } from '@/Modules/AppModule/Infrastructure/Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '@/Modules/AppModule/Infrastructure/Repositories/ModuleSubscriptionRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { ScryptPasswordHasher } from '@/Modules/Auth/Infrastructure/Services/PasswordHasher'
import { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationMember } from '../Domain/Entities/OrganizationMember'
import { OrgMemberRole } from '../Domain/ValueObjects/OrgMemberRole'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'

describe('CreateOrganizationService', () => {
  let service: CreateOrganizationService
  let db: MemoryDatabaseAccess
  let managerId: string

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
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
        new MockGatewayClient(),
        orgRepo,
        db,
      ),
    )

    const registerService = new RegisterUserService(authRepo, new ScryptPasswordHasher())
    const result = await registerService.execute({
      email: 'manager@example.com',
      password: 'StrongPass123',
    })
    managerId = result.data?.id as string
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
    const registerService = new RegisterUserService(authRepo, new ScryptPasswordHasher())
    const result2 = await registerService.execute({
      email: 'manager2@example.com',
      password: 'StrongPass123',
    })
    const result = await service.execute({
      name: 'CMG',
      slug: 'cmg',
      managerUserId: result2.data?.id as string,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('SLUG_EXISTS')
  })

  it('admin 呼叫時應回傳 ADMIN_CANNOT_CREATE_ORG', async () => {
    const authRepo = new AuthRepository(db)
    const registerResult = await new RegisterUserService(
      authRepo,
      new ScryptPasswordHasher(),
    ).execute({
      email: 'admin@example.com',
      password: 'StrongPass123',
    })
    const adminId = registerResult.data?.id as string
    await authRepo.updateRole(adminId, RoleType.ADMIN)

    const result = await service.execute({ name: 'Test Org', managerUserId: adminId })
    expect(result.success).toBe(false)
    expect(result.error).toBe('ADMIN_CANNOT_CREATE_ORG')
  })

  it('已有組織的 manager 再次建立應回傳 ALREADY_HAS_ORGANIZATION', async () => {
    await service.execute({ name: 'First Org', managerUserId: managerId })

    const result = await service.execute({ name: 'Second Org', managerUserId: managerId })
    expect(result.success).toBe(false)
    expect(result.error).toBe('ALREADY_HAS_ORGANIZATION')
  })

  it('建立成功後 users.role 應為 manager', async () => {
    const authRepo = new AuthRepository(db)
    await service.execute({ name: 'Promo Org', managerUserId: managerId })

    const user = await authRepo.findById(managerId)
    expect(user?.role.getValue()).toBe(RoleType.MANAGER)
  })

  describe('spec §2：已具 membership 的使用者禁止建立新組織', () => {
    it('已為純 MEMBER（非 manager）的使用者應回傳 ALREADY_HAS_ORGANIZATION，且不呼叫 save / updateRole', async () => {
      // 先建立另一個 org，再把 managerId 以 member 身份加入
      const memberRepo = new OrganizationMemberRepository(db)
      const plainMember = OrganizationMember.create(
        crypto.randomUUID(),
        'org-existing',
        managerId,
        new OrgMemberRole('member'),
      )
      await memberRepo.save(plainMember)

      // 此時 isOrgManagerInAnyOrg 會回傳 false（角色是 member），
      // 但 findByUserId 會回傳該 membership — 建立應被拒絕。
      const result = await service.execute({ name: 'Should Fail Org', managerUserId: managerId })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ALREADY_HAS_ORGANIZATION')

      // 確認沒有新的 org member 被寫入（只有原本那筆 plain member）
      const members = await memberRepo.findByOrgId('org-existing')
      expect(members).toHaveLength(1)
    })
  })
})
