import { beforeEach, describe, expect, it } from 'vitest'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { CreateApiKeyService } from '../Application/Services/CreateApiKeyService'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'

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
    const sync = new ApiKeyBifrostSync(gatewayMock, orgRepo)
    service = new CreateApiKeyService(apiKeyRepo, orgAuth, sync, hashingService)

    const org = Organization.create('org-1', 'Test Org', 'test').attachGatewayTeam('gwt-org-1')
    await orgRepo.save(org)
    const member = OrganizationMember.create(
      'mem-1',
      'org-1',
      'user-1',
      new OrgMemberRole('manager'),
    )
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
    expect(gatewayMock.calls.createKey[0].name).toBe(result.data?.id)
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

  it('建立時可附帶 budget（上限與週期須成對）', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Budgeted Key',
      budgetMaxLimit: 25,
      budgetResetPeriod: '30d',
    })
    expect(result.success).toBe(true)
    expect(gatewayMock.calls.createKey[0].budget).toEqual({
      maxLimit: 25,
      resetDuration: '30d',
    })
    const id = result.data?.id as string
    const saved = await apiKeyRepo.findById(id)
    expect(saved?.quotaAllocated).toBe(25)
  })

  it('僅填上限未選週期應回傳 BUDGET_INCOMPLETE', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Bad Budget',
      budgetMaxLimit: 10,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('BUDGET_INCOMPLETE')
  })

  it('Gateway 失敗時應清理本地 pending 記錄', async () => {
    const failMock = new MockGatewayClient()
    failMock.failNext(new GatewayError('連線失敗', 'NETWORK', 503, true))
    const failSync = new ApiKeyBifrostSync(failMock, new OrganizationRepository(db))
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
