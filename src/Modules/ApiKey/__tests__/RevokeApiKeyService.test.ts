import { beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { RevokeApiKeyService } from '../Application/Services/RevokeApiKeyService'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'

const hashingService = new KeyHashingService()

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
    const sync = new ApiKeyBifrostSync(gatewayMock, new OrganizationRepository(db))
    service = new RevokeApiKeyService(apiKeyRepo, orgAuth, sync)

    const member = OrganizationMember.create(
      'mem-1',
      'org-1',
      'user-1',
      new OrgMemberRole('manager'),
    )
    await memberRepo.save(member)

    // Seed gateway mock so deactivateVirtualKey can call updateKey
    const seededKey = await gatewayMock.createKey({ name: 'Active Key', isActive: true })

    const keyHash = await hashingService.hash('drp_sk_active')
    const key = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Active Key',
      gatewayKeyId: seededKey.id,
      keyHash,
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
