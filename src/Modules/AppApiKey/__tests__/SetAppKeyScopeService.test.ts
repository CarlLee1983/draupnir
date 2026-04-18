import { beforeEach, describe, expect, it } from 'vitest'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { SetAppKeyScopeService } from '../Application/Services/SetAppKeyScopeService'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'

const hashingService = new KeyHashingService()

describe('SetAppKeyScopeService', () => {
  let service: SetAppKeyScopeService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    service = new SetAppKeyScopeService(appKeyRepo, orgAuth)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', new OrgMemberRole('manager'))
    await memberRepo.save(member)
    const nonManager = OrganizationMember.create('mem-2', 'org-1', 'user-2', new OrgMemberRole('member'))
    await memberRepo.save(nonManager)

    const keyHash = await hashingService.hash('drp_app_scope123')
    const key = AppApiKey.create({
      id: 'appkey-scope',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Scope Test',
      gatewayKeyId: 'bfr-vk-scope',
      keyHash,
    })
    await appKeyRepo.save(key.activate())
  })

  it('應成功更新 scope', async () => {
    const result = await service.execute({
      keyId: 'appkey-scope',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      scope: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toBe('admin')
  })

  it('應成功更新綁定模組', async () => {
    const result = await service.execute({
      keyId: 'appkey-scope',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      boundModuleIds: ['mod-1', 'mod-2'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.boundModules).toEqual(['mod-1', 'mod-2'])
  })

  it('應同時更新 scope 和綁定模組', async () => {
    const result = await service.execute({
      keyId: 'appkey-scope',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      scope: 'write',
      boundModuleIds: ['mod-3'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toBe('write')
    expect(result.data?.boundModules).toEqual(['mod-3'])
  })

  it('Key 不存在應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'nonexistent',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      scope: 'admin',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })

  it('Org Member 但非 Manager 應回傳 NOT_ORG_MANAGER', async () => {
    const result = await service.execute({
      keyId: 'appkey-scope',
      callerUserId: 'user-2',
      callerSystemRole: 'user',
      scope: 'admin',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MANAGER')
  })
})
