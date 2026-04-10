import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetDashboardSummaryService } from '../Application/Services/GetDashboardSummaryService'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'

const hashingService = new KeyHashingService()
let key1Hash: string
let key2Hash: string

beforeAll(async () => {
  key1Hash = await hashingService.hash('drp_sk_1')
  key2Hash = await hashingService.hash('drp_sk_2')
})

function createMockAggregator(): UsageAggregator {
  const gatewayMock = new MockGatewayClient()
  gatewayMock.seedUsageStats({ totalRequests: 42, totalCost: 1.5, totalTokens: 10000, avgLatency: 200 })
  return new UsageAggregator(gatewayMock)
}

describe('GetDashboardSummaryService', () => {
  let service: GetDashboardSummaryService
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository
  let memberRepo: OrganizationMemberRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const aggregator = createMockAggregator()
    service = new GetDashboardSummaryService(apiKeyRepo, orgAuth, aggregator)

    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key1 = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Key 1',
      gatewayKeyId: 'bfr-vk-1',
      keyHash: key1Hash,
    })
    const key2 = ApiKey.create({
      id: 'key-2',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Key 2',
      gatewayKeyId: 'bfr-vk-2',
      keyHash: key2Hash,
    })
    await apiKeyRepo.save(key1.activate())
    await apiKeyRepo.save(key2.activate())
  })

  it('應回傳 Dashboard 摘要資料', async () => {
    const result = await service.execute('org-1', 'user-1', 'user')
    expect(result.success).toBe(true)
    expect(result.data?.totalKeys).toBe(2)
    expect(result.data?.activeKeys).toBe(2)
    expect(result.data?.usage.totalRequests).toBe(42)
    expect(result.data?.usage.totalCost).toBeCloseTo(1.5)
  })

  it('非 Org 成員不能存取 Dashboard', async () => {
    const result = await service.execute('org-1', 'outsider', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('admin 可存取任何 Org 的 Dashboard', async () => {
    const result = await service.execute('org-1', 'admin-user', 'admin')
    expect(result.success).toBe(true)
  })
})
