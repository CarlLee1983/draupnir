import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetUsageChartService } from '../Application/Services/GetUsageChartService'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { LogEntry } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'

const sampleLog: LogEntry = {
  timestamp: '2026-04-08T10:00:00Z',
  keyId: 'bfr-vk-1',
  model: 'gpt-4',
  provider: 'openai',
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  latencyMs: 200,
  cost: 0.03,
  status: 'success',
}

const hashingService = new KeyHashingService()
let key1Hash: string

beforeAll(async () => {
  key1Hash = await hashingService.hash('drp_sk_1')
})

function createMockAggregator(): UsageAggregator {
  const gatewayMock = new MockGatewayClient()
  gatewayMock.seedUsageLogs([sampleLog])
  gatewayMock.seedUsageStats({ totalRequests: 1, totalCost: 0.03, totalTokens: 150, avgLatency: 200 })
  return new UsageAggregator(gatewayMock)
}

describe('GetUsageChartService', () => {
  let service: GetUsageChartService
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const aggregator = createMockAggregator()
    service = new GetUsageChartService(apiKeyRepo, orgAuth, aggregator)

    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Key 1',
      gatewayKeyId: 'bfr-vk-1',
      keyHash: key1Hash,
    })
    await apiKeyRepo.save(key.activate())
  })

  it('應回傳用量 log 和統計', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    expect(result.data?.logs).toHaveLength(1)
    expect(result.data?.stats.totalRequests).toBe(1)
  })

  it('非 Org 成員不能存取用量資料', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('無 Key 的 Org 應回傳空結果', async () => {
    const result = await service.execute({
      orgId: 'org-empty',
      callerUserId: 'user-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.logs).toHaveLength(0)
  })
})
