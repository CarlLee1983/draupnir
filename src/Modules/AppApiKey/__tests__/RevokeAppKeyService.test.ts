import { beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { RevokeAppKeyService } from '../Application/Services/RevokeAppKeyService'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Infrastructure/Services/AppKeyBifrostSync'

const hashingService = new KeyHashingService()

describe('RevokeAppKeyService', () => {
  let service: RevokeAppKeyService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository
  let gatewayMock: MockGatewayClient

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    gatewayMock = new MockGatewayClient()
    // Seed the virtual key into the mock store so deactivateVirtualKey (updateKey) succeeds
    await gatewayMock.createKey({ name: '[App] Revoke Test', customerId: 'org-1' })
    const sync = new AppKeyBifrostSync(gatewayMock)
    service = new RevokeAppKeyService(appKeyRepo, orgAuth, sync)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', new OrgMemberRole('manager'))
    await memberRepo.save(member)
    const nonManager = OrganizationMember.create('mem-2', 'org-1', 'user-2', new OrgMemberRole('member'))
    await memberRepo.save(nonManager)

    const keyHash = await hashingService.hash('drp_app_revoke123')
    const key = AppApiKey.create({
      id: 'appkey-revoke',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Revoke Test',
      gatewayKeyId: 'mock_vk_000001',
      keyHash,
    })
    await appKeyRepo.save(key.activate())
  })

  it('應成功撤銷 Key 並停用 Bifrost VK', async () => {
    const result = await service.execute({
      keyId: 'appkey-revoke',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    const updated = await appKeyRepo.findById('appkey-revoke')
    expect(updated?.status).toBe('revoked')
  })

  it('Key 不存在應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'nonexistent',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'appkey-revoke',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('Org Member 但非 Manager 應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'appkey-revoke',
      callerUserId: 'user-2',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MANAGER')
  })
})
