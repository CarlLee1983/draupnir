import { beforeEach, describe, expect, it } from 'vitest'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RegisterAppService } from '../Application/Services/RegisterAppService'
import { ApplicationRepository } from '../Infrastructure/Repositories/ApplicationRepository'

describe('RegisterAppService', () => {
  let service: RegisterAppService
  let db: MemoryDatabaseAccess
  let appRepo: ApplicationRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appRepo = new ApplicationRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    service = new RegisterAppService(appRepo, orgAuth)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create(
      'mem-1',
      'org-1',
      'user-1',
      new OrgMemberRole('manager'),
    )
    await memberRepo.save(member)
  })

  it('應成功註冊新的 Application', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      name: 'My App',
      description: 'My test application',
      redirectUris: ['https://example.com/cb'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.id).toBeTruthy()
    expect(result.data?.name).toBe('My App')
    expect(result.data?.status).toBe('active')
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'outsider',
      callerSystemRole: 'user',
      name: 'Unauthorized App',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('空名稱應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('應在 DB 中建立記錄', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      name: 'Persisted App',
    })
    expect(result.success).toBe(true)
    const apps = await appRepo.findByOrgId('org-1')
    expect(apps).toHaveLength(1)
    expect(apps[0].name).toBe('Persisted App')
  })
})
