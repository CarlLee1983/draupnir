import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetAppKeyUsageService } from '../Application/Services/GetAppKeyUsageService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockBifrostClient(): BifrostClient {
	return {
		getLogs: vi.fn().mockResolvedValue({
			data: [],
			total: 0,
		}),
		getLogsStats: vi.fn().mockResolvedValue({
			total_requests: 42,
			total_tokens: 12345,
			total_cost: 0.56,
		}),
	} as unknown as BifrostClient
}

describe('GetAppKeyUsageService', () => {
	let service: GetAppKeyUsageService
	let db: MemoryDatabaseAccess

	beforeEach(async () => {
		db = new MemoryDatabaseAccess()
		const appKeyRepo = new AppApiKeyRepository(db)
		const orgRepo = new OrganizationRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)
		const bifrostClient = createMockBifrostClient()
		service = new GetAppKeyUsageService(appKeyRepo, orgAuth, bifrostClient)

		const org = Organization.create('org-1', 'Test Org', 'test')
		await orgRepo.save(org)
		const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
		await memberRepo.save(member)

		const key = await AppApiKey.create({
			id: 'appkey-usage',
			orgId: 'org-1',
			issuedByUserId: 'user-1',
			label: 'Usage Test',
			bifrostVirtualKeyId: 'bfr-vk-usage',
			rawKey: 'drp_app_usage123',
		})
		await appKeyRepo.save(key.activate())
	})

	it('應成功查詢用量統計', async () => {
		const result = await service.execute({
			keyId: 'appkey-usage',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
		})
		expect(result.success).toBe(true)
		expect(result.data?.totalRequests).toBe(42)
		expect(result.data?.totalTokens).toBe(12345)
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
})
