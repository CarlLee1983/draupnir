import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RevokeApiKeyService } from '../Application/Services/RevokeApiKeyService'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(): ApiKeyBifrostSync {
	const mockClient = {
		createVirtualKey: vi.fn(),
		updateVirtualKey: vi.fn().mockResolvedValue({
			id: 'bfr-vk-1',
			name: 'test',
			is_active: false,
			provider_configs: [],
		}),
		deleteVirtualKey: vi.fn(),
		listModels: vi.fn(),
	} as unknown as BifrostClient
	return new ApiKeyBifrostSync(mockClient)
}

describe('RevokeApiKeyService', () => {
	let service: RevokeApiKeyService
	let db: MemoryDatabaseAccess
	let apiKeyRepo: ApiKeyRepository

	beforeEach(async () => {
		db = new MemoryDatabaseAccess()
		apiKeyRepo = new ApiKeyRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)
		const sync = createMockSync()
		service = new RevokeApiKeyService(apiKeyRepo, orgAuth, sync)

		const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
		await memberRepo.save(member)

		const key = await ApiKey.create({
			id: 'key-1',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Active Key',
			bifrostVirtualKeyId: 'bfr-vk-1',
			rawKey: 'drp_sk_active',
		})
		await apiKeyRepo.save(key.activate())
	})

	it('應成功撤銷 Key 並停用 Bifrost Virtual Key', async () => {
		const result = await service.execute({ keyId: 'key-1', callerUserId: 'user-1', callerSystemRole: 'user' })
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
		const result = await service.execute({ keyId: 'key-1', callerUserId: 'user-1', callerSystemRole: 'user' })
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
