import { beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { UpdateApiKeyBudgetService } from '../Application/Services/UpdateApiKeyBudgetService'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'

const hashingService = new KeyHashingService()

describe('UpdateApiKeyBudgetService', () => {
  let service: UpdateApiKeyBudgetService
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository
  let gatewayMock: MockGatewayClient

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    gatewayMock = new MockGatewayClient()
    const sync = new ApiKeyBifrostSync(gatewayMock)
    service = new UpdateApiKeyBudgetService(apiKeyRepo, orgAuth, sync)

    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', new OrgMemberRole('manager'))
    await memberRepo.save(member)

    const seededKey = await gatewayMock.createKey({ name: 'Test Key', isActive: true })
    const keyHash = await hashingService.hash('drp_sk_test')
    const key = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      gatewayKeyId: seededKey.id,
      keyHash,
    })
    await apiKeyRepo.save(key.activate())
  })

  it('應成功更新 gateway budget', async () => {
    const result = await service.execute({
      keyId: 'key-1',
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      budgetMaxLimit: 42,
      budgetResetPeriod: '7d',
    })
    expect(result.success).toBe(true)
    expect(gatewayMock.calls.updateKey[0].request.budget).toEqual({
      maxLimit: 42,
      resetDuration: '7d',
    })
  })

  it('orgId 與 Key 不符應拒絕', async () => {
    const result = await service.execute({
      keyId: 'key-1',
      orgId: 'other-org',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      budgetMaxLimit: 10,
      budgetResetPeriod: '30d',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('ORG_MISMATCH')
  })
})
