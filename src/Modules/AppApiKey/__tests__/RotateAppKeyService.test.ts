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
import { RotateAppKeyService } from '../Application/Services/RotateAppKeyService'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Infrastructure/Services/AppKeyBifrostSync'

const hashingService = new KeyHashingService()

describe('RotateAppKeyService', () => {
  let service: RotateAppKeyService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const gatewayMock = new MockGatewayClient()
    const sync = new AppKeyBifrostSync(gatewayMock)
    service = new RotateAppKeyService(appKeyRepo, orgAuth, sync, hashingService)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', new OrgMemberRole('manager'))
    await memberRepo.save(member)

    const keyHash = await hashingService.hash('drp_app_original123')
    const key = AppApiKey.create({
      id: 'appkey-rotate',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Rotate Test',
      gatewayKeyId: 'bfr-vk-original',
      keyHash,
    })
    await appKeyRepo.save(key.activate())
  })

  it('應成功輪換 Key 並回傳新 rawKey', async () => {
    const result = await service.execute({
      keyId: 'appkey-rotate',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    expect(result.data?.rawKey).toBeTruthy()
    expect((result.data?.rawKey as string).startsWith('drp_app_')).toBe(true)
    expect(result.data?.isInGracePeriod).toBe(true)
    expect(result.data?.gracePeriodEndsAt).toBeTruthy()
  })

  it('輪換後舊 Key hash 應被保存', async () => {
    await service.execute({
      keyId: 'appkey-rotate',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    const updated = await appKeyRepo.findById('appkey-rotate')
    expect(updated?.previousKeyHash).toBeTruthy()
    expect(updated?.previousGatewayKeyId).toBe('bfr-vk-original')
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
      keyId: 'appkey-rotate',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })
})
