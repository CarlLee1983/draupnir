import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RevokeApiKeyService } from '../Application/Services/RevokeApiKeyService'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { ApiKey } from '../Domain/Aggregates/ApiKey'

describe('RevokeApiKeyService', () => {
  let service: RevokeApiKeyService
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
    service = new RevokeApiKeyService(apiKeyRepo, orgAuth, sync)

    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    // Seed gateway mock so deactivateVirtualKey can call updateKey
    const seededKey = await gatewayMock.createKey({ name: 'Active Key', isActive: true })

    const key = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Active Key',
      gatewayKeyId: seededKey.id,
      rawKey: 'drp_sk_active',
    })
    await apiKeyRepo.save(key.activate())
  })

  it('應成功撤銷 Key 並停用 gateway virtual key', async () => {
    const result = await service.execute({
      keyId: 'key-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    const revoked = await apiKeyRepo.findById('key-1')
    expect(revoked?.status).toBe('revoked')
  })

  it('不存在的 Key 應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'nonexistent',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })

  it('已撤銷的 Key 應回傳錯誤', async () => {
    await service.execute({ keyId: 'key-1', callerUserId: 'user-1', callerSystemRole: 'user' })
    const result = await service.execute({
      keyId: 'key-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('ALREADY_REVOKED')
  })

  it('非 Org 成員不能撤銷其他 Org 的 Key', async () => {
    const result = await service.execute({
      keyId: 'key-1',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })
})
