import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { SetKeyPermissionsService } from '../Application/Services/SetKeyPermissionsService'
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
			is_active: true,
			provider_configs: [],
		}),
		deleteVirtualKey: vi.fn(),
		listModels: vi.fn(),
	} as unknown as BifrostClient
	return new ApiKeyBifrostSync(mockClient)
}

describe('SetKeyPermissionsService', () => {
	let service: SetKeyPermissionsService
	let db: MemoryDatabaseAccess
	let apiKeyRepo: ApiKeyRepository

	beforeEach(async () => {
		db = new MemoryDatabaseAccess()
		apiKeyRepo = new ApiKeyRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)
		const sync = createMockSync()
		service = new SetKeyPermissionsService(apiKeyRepo, orgAuth, sync)

		const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
		await memberRepo.save(member)

		const key = await ApiKey.create({
			id: 'key-1',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Test Key',
			bifrostVirtualKeyId: 'bfr-vk-1',
			rawKey: 'drp_sk_test',
		})
		await apiKeyRepo.save(key.activate())
	})

	it('應成功更新 Key 權限並同步 Bifrost', async () => {
		const result = await service.execute({
			keyId: 'key-1',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
			allowedModels: ['gpt-4'],
			rateLimitRpm: 120,
		})
		expect(result.success).toBe(true)
		const updated = await apiKeyRepo.findById('key-1')
		expect(updated?.scope.getAllowedModels()).toEqual(['gpt-4'])
		expect(updated?.scope.getRateLimitRpm()).toBe(120)
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

	it('非 Org 成員不能修改權限', async () => {
		const result = await service.execute({
			keyId: 'key-1',
			callerUserId: 'outsider',
			callerSystemRole: 'user',
			rateLimitRpm: 60,
		})
		expect(result.success).toBe(false)
		expect(result.error).toBe('NOT_ORG_MEMBER')
	})

	it('已撤銷的 Key 應回傳錯誤', async () => {
		const key = await apiKeyRepo.findById('key-1')
		const revoked = key!.revoke()
		await apiKeyRepo.update(revoked)

		const result = await service.execute({
			keyId: 'key-1',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
			rateLimitRpm: 60,
		})
		expect(result.success).toBe(false)
	})
})
