import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { LogEntry } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { GetUsageChartService } from '../Application/Services/GetUsageChartService'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'

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
let key2Hash: string
let keyOtherHash: string

beforeAll(async () => {
  key1Hash = await hashingService.hash('drp_sk_1')
  key2Hash = await hashingService.hash('drp_sk_2')
  keyOtherHash = await hashingService.hash('drp_sk_other')
})

function createMockAggregator(): UsageAggregator {
  const gatewayMock = new MockGatewayClient()
  gatewayMock.seedUsageLogs([sampleLog])
  gatewayMock.seedUsageStats({
    totalRequests: 1,
    totalCost: 0.03,
    totalTokens: 150,
    avgLatency: 200,
  })
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
    expect(result.data?.stats.totalTokens).toBe(150)
    const log0 = result.data?.logs[0] as { inputTokens?: number; outputTokens?: number }
    expect(log0?.inputTokens).toBe(100)
    expect(log0?.outputTokens).toBe(50)
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

  it('org manager 可查詢 org 內所有 keys 的用量 log', async () => {
    const key2 = ApiKey.create({
      id: 'key-2',
      orgId: 'org-1',
      createdByUserId: 'user-other',
      label: 'Key 2',
      gatewayKeyId: 'bfr-vk-2',
      keyHash: keyOtherHash,
    })
    await apiKeyRepo.save(key2.activate())

    const gatewayMock = new MockGatewayClient()
    gatewayMock.seedUsageLogs([sampleLog, { ...sampleLog, keyId: 'bfr-vk-2' }])
    gatewayMock.seedUsageStats({
      totalRequests: 2,
      totalCost: 0.06,
      totalTokens: 300,
      avgLatency: 200,
    })
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const aggregator = new UsageAggregator(gatewayMock)
    const multiKeyService = new GetUsageChartService(apiKeyRepo, orgAuth, aggregator)

    const result = await multiKeyService.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    expect(result.data?.logs).toHaveLength(2)
  })

  describe('org member role (isolated org)', () => {
    beforeEach(async () => {
      db = new MemoryDatabaseAccess()
      apiKeyRepo = new ApiKeyRepository(db)
      const memberRepo = new OrganizationMemberRepository(db)
      const orgAuth = new OrgAuthorizationHelper(memberRepo)
      const aggregator = createMockAggregator()
      service = new GetUsageChartService(apiKeyRepo, orgAuth, aggregator)

      await memberRepo.save(OrganizationMember.create('mem-a', 'org-m', 'alice', 'member'))

      const aliceKey = ApiKey.create({
        id: 'key-alice',
        orgId: 'org-m',
        createdByUserId: 'alice',
        label: 'Alice',
        gatewayKeyId: 'bfr-vk-alice',
        keyHash: key1Hash,
      })
      const bobKey = ApiKey.create({
        id: 'key-bob',
        orgId: 'org-m',
        createdByUserId: 'bob',
        label: 'Bob',
        gatewayKeyId: 'bfr-vk-bob',
        keyHash: key2Hash,
      })
      await apiKeyRepo.save(aliceKey.activate())
      await apiKeyRepo.save(bobKey.activate())
    })

    it('member 僅將自己的 gateway key ids 傳入用量查詢', async () => {
      const gatewayMock = new MockGatewayClient()
      const aliceLog: LogEntry = { ...sampleLog, keyId: 'bfr-vk-alice' }
      gatewayMock.seedUsageLogs([aliceLog])
      gatewayMock.seedUsageStats({
        totalRequests: 1,
        totalCost: 0.03,
        totalTokens: 150,
        avgLatency: 200,
      })
      const memberRepo = new OrganizationMemberRepository(db)
      const orgAuth = new OrgAuthorizationHelper(memberRepo)
      const aggregator = new UsageAggregator(gatewayMock)
      const scoped = new GetUsageChartService(apiKeyRepo, orgAuth, aggregator)

      const result = await scoped.execute({
        orgId: 'org-m',
        callerUserId: 'alice',
        callerSystemRole: 'user',
      })
      expect(result.success).toBe(true)
      expect(gatewayMock.calls.getUsageLogs[0]?.keyIds).toEqual(['bfr-vk-alice'])
      expect(result.data?.logs).toHaveLength(1)
      const firstLog = result.data?.logs[0] as unknown as LogEntry
      expect(firstLog.keyId).toBe('bfr-vk-alice')
    })
  })
})
