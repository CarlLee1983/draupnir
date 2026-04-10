import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreateApiKeyService } from '../Application/Services/CreateApiKeyService'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'

const hashingService = new KeyHashingService()

describe('CreateApiKeyService', () => {
  let service: CreateApiKeyService
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository
  let gatewayMock: MockGatewayClient

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    gatewayMock = new MockGatewayClient()
    const sync = new ApiKeyBifrostSync(gatewayMock)
    service = new CreateApiKeyService(apiKeyRepo, orgAuth, sync, hashingService)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)
  })

  it('應成功建立 API Key 並回傳 rawKey（最終狀態為 active）', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'My Production Key',
    })
    expect(result.success).toBe(true)
    expect(result.data?.rawKey).toBeTruthy()
    expect(result.data?.id).toBeTruthy()
    expect(result.data?.label).toBe('My Production Key')
    expect(result.data?.status).toBe('active')
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'outsider',
      callerSystemRole: 'user',
      label: 'Key',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('空 label 應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: '',
    })
    expect(result.success).toBe(false)
  })

  it('應支援帶權限的 Key 建立', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Restricted Key',
      allowedModels: ['gpt-4'],
      rateLimitRpm: 60,
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toEqual(expect.objectContaining({ allowed_models: ['gpt-4'] }))
  })

  it('Gateway 失敗時應清理本地 pending 記錄', async () => {
    const failMock = new MockGatewayClient()
    failMock.failNext(new GatewayError('連線失敗', 'NETWORK', 503, true))
    const failSync = new ApiKeyBifrostSync(failMock)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const failService = new CreateApiKeyService(apiKeyRepo, orgAuth, failSync, hashingService)

    const result = await failService.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Will Fail',
    })
    expect(result.success).toBe(false)
    const keys = await apiKeyRepo.findByOrgId('org-1')
    expect(keys).toHaveLength(0)
  })
})
