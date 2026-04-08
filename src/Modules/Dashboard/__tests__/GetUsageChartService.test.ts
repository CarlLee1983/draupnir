import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetUsageChartService } from '../Application/Services/GetUsageChartService'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostLogEntry } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

const sampleLog: BifrostLogEntry = {
	id: 'log-1',
	provider: 'openai',
	model: 'gpt-4',
	status: 'success',
	object: 'chat.completion',
	timestamp: '2026-04-08T10:00:00Z',
	latency: 200,
	cost: 0.03,
	virtual_key_id: 'bfr-vk-1',
	input_tokens: 100,
	output_tokens: 50,
	total_tokens: 150,
}

function createMockAggregator(): UsageAggregator {
	const mockClient = {
		getLogs: vi.fn().mockResolvedValue({ logs: [sampleLog], total: 1 }),
		getLogsStats: vi.fn().mockResolvedValue({
			total_requests: 1,
			total_cost: 0.03,
			total_tokens: 150,
			avg_latency: 200,
		}),
		listModels: vi.fn(),
	} as unknown as BifrostClient
	return new UsageAggregator(mockClient)
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

		const key = await ApiKey.create({
			id: 'key-1',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Key 1',
			bifrostVirtualKeyId: 'bfr-vk-1',
			rawKey: 'drp_sk_1',
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
