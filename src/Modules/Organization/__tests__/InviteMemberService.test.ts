import { beforeEach, describe, expect, it } from 'vitest'
import { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import { AppModuleRepository } from '@/Modules/AppModule/Infrastructure/Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '@/Modules/AppModule/Infrastructure/Repositories/ModuleSubscriptionRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { ScryptPasswordHasher } from '@/Modules/Auth/Infrastructure/Services/PasswordHasher'
import { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'

describe('InviteMemberService', () => {
  let inviteService: InviteMemberService
  let orgId: string
  let managerId: string

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    const db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const invitationRepo = new OrganizationInvitationRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)

    const createOrgService = new CreateOrganizationService(
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
    inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)

    const registerService = new RegisterUserService(authRepo, new ScryptPasswordHasher())
    const userResult = await registerService.execute({
      email: 'manager@example.com',
      password: 'StrongPass123',
    })
    managerId = userResult.data!.id

    const orgResult = await createOrgService.execute({
      name: 'Test Org',
      managerUserId: managerId,
    })
    orgId = orgResult.data!.id as string
  })

  it('應成功產生邀請連結', async () => {
    const result = await inviteService.execute(orgId, managerId, 'user', {
      email: 'new@example.com',
    })
    expect(result.success).toBe(true)
    expect(result.data?.token).toBeTruthy()
    expect(result.data?.expiresAt).toBeTruthy()
  })

  it('不存在的組織應回傳錯誤', async () => {
    const result = await inviteService.execute('nonexistent', managerId, 'user', {
      email: 'new@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('空的 email 應回傳錯誤', async () => {
    const result = await inviteService.execute(orgId, managerId, 'user', { email: '' })
    expect(result.success).toBe(false)
  })
})
