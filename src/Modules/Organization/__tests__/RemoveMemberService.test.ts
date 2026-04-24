import { beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
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
import { AcceptInvitationService } from '../Application/Services/AcceptInvitationService'
import { ChangeOrgMemberRoleService } from '../Application/Services/ChangeOrgMemberRoleService'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'
import { RemoveMemberService } from '../Application/Services/RemoveMemberService'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'

describe('RemoveMemberService', () => {
  let removeService: RemoveMemberService
  let db: MemoryDatabaseAccess
  let memberRepo: OrganizationMemberRepository
  let orgRepo: OrganizationRepository
  let invitationRepo: OrganizationInvitationRepository
  let orgAuth: OrgAuthorizationHelper
  let orgId: string
  let managerId: string
  let memberId: string

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    orgRepo = new OrganizationRepository(db)
    memberRepo = new OrganizationMemberRepository(db)
    invitationRepo = new OrganizationInvitationRepository(db)
    orgAuth = new OrgAuthorizationHelper(memberRepo)
    const apiKeyRepo = new ApiKeyRepository(db)

    const registerService = new RegisterUserService(authRepo, new ScryptPasswordHasher())
    const createOrgService = new CreateOrganizationService(
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
    const inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)
    const acceptService = new AcceptInvitationService(invitationRepo, memberRepo, authRepo, db)
    removeService = new RemoveMemberService(memberRepo, orgAuth, db, authRepo, apiKeyRepo)

    const managerResult = await registerService.execute({
      email: 'manager@example.com',
      password: 'StrongPass123',
    })
    managerId = managerResult.data?.id as string

    const orgResult = await createOrgService.execute({
      name: 'Test Org',
      managerUserId: managerId,
    })
    orgId = orgResult.data?.id as string

    const memberResult = await registerService.execute({
      email: 'member@example.com',
      password: 'StrongPass123',
    })
    memberId = memberResult.data?.id as string
    const inviteResult = await inviteService.execute(orgId, managerId, 'user', {
      email: 'member@example.com',
    })
    await acceptService.execute(memberId, { token: inviteResult.data?.token as string })
  })

  it('應成功移除成員', async () => {
    const result = await removeService.execute(orgId, memberId, managerId, 'user')
    expect(result.success).toBe(true)
  })

  it('不能移除自己', async () => {
    const result = await removeService.execute(orgId, managerId, managerId, 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('CANNOT_REMOVE_SELF')
  })

  it('不能移除最後一個 Manager', async () => {
    const result = await removeService.execute(orgId, managerId, memberId, 'admin')
    expect(result.success).toBe(false)
    expect(result.error).toBe('CANNOT_REMOVE_LAST_MANAGER')
  })

  it('移除最後一個 org manager 後其系統角色應降為 member', async () => {
    const authRepo = new AuthRepository(db)
    const changeSvc = new ChangeOrgMemberRoleService(memberRepo, db, authRepo)
    await changeSvc.execute(orgId, memberId, 'manager')

    await removeService.execute(orgId, managerId, memberId, 'user')

    const user = await authRepo.findById(managerId)
    expect(user?.role.getValue()).toBe(RoleType.MEMBER)
  })

  it('移除成員後其仍有其他組織的 manager 角色時系統角色不變', async () => {
    const authRepo = new AuthRepository(db)
    const before = await authRepo.findById(memberId)
    await removeService.execute(orgId, memberId, managerId, 'user')
    const after = await authRepo.findById(memberId)
    expect(after?.role.getValue()).toBe(before?.role.getValue())
  })

  it('移除成員時會清除該組織下被指派給該成員的 key', async () => {
    const apiKeyRepo = new ApiKeyRepository(db)

    // 建立一個 API key 並指派給 memberId
    const { ApiKey } = await import('@/Modules/ApiKey/Domain/Aggregates/ApiKey')
    const key = ApiKey.create({
      id: 'key-001',
      orgId,
      createdByUserId: managerId,
      label: 'Test Key',
      gatewayKeyId: 'gw-001',
      keyHash: 'hash-abc',
    }).assignTo(memberId)
    await apiKeyRepo.save(key)

    // 移除成員
    const result = await removeService.execute(orgId, memberId, managerId, 'user')
    expect(result.success).toBe(true)

    // 確認 key 的 assigned_member_id 已被清除
    const updatedKey = await apiKeyRepo.findById(key.id)
    expect(updatedKey).not.toBeNull()
    expect(updatedKey?.assignedMemberId).toBeNull()
  })

  it('移除 global admin 成員時不應降低其系統角色', async () => {
    const authRepo = new AuthRepository(db)
    // 建立一個 admin 使用者並加入組織（以 member 身份）
    const adminResult = await new RegisterUserService(authRepo, new ScryptPasswordHasher()).execute(
      {
        email: 'admin@example.com',
        password: 'StrongPass123',
      },
    )
    const adminUserId = adminResult.data?.id as string
    await authRepo.updateRole(adminUserId, RoleType.ADMIN)

    // 以 invitation 讓 admin 加入組織
    const inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)
    const acceptService = new AcceptInvitationService(invitationRepo, memberRepo, authRepo, db)
    const inv = await inviteService.execute(orgId, managerId, 'user', {
      email: 'admin@example.com',
    })
    await acceptService.execute(adminUserId, { token: inv.data?.token as string })

    // 移除這位 admin
    await removeService.execute(orgId, adminUserId, managerId, 'user')

    // admin 系統角色應維持 admin
    const user = await authRepo.findById(adminUserId)
    expect(user?.role.getValue()).toBe(RoleType.ADMIN)
  })
})
