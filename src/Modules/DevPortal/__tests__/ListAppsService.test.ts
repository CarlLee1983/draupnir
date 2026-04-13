import { beforeEach, describe, expect, it } from 'vitest'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ListAppsService } from '../Application/Services/ListAppsService'
import { Application } from '../Domain/Aggregates/Application'
import { ApplicationRepository } from '../Infrastructure/Repositories/ApplicationRepository'

describe('ListAppsService', () => {
  let service: ListAppsService
  let db: MemoryDatabaseAccess
  let appRepo: ApplicationRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appRepo = new ApplicationRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    service = new ListAppsService(appRepo, orgAuth)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    await appRepo.save(
      Application.create({
        id: 'app-a',
        name: 'App A',
        description: '',
        orgId: 'org-1',
        createdByUserId: 'user-1',
      }),
    )
  })

  it('應列出組織下的 Applications', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    expect(result.data?.apps).toHaveLength(1)
    expect(result.data?.apps[0].name).toBe('App A')
    expect(result.data?.meta.total).toBe(1)
  })

  it('非成員應失敗', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })
})
