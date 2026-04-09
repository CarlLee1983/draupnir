import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RevokeAppKeyService } from '../Application/Services/RevokeAppKeyService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Infrastructure/Services/AppKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(): AppKeyBifrostSync {
	const mockClient = {
		createVirtualKey: vi.fn(),
		updateVirtualKey: vi.fn().mockResolvedValue({}),
		deleteVirtualKey: vi.fn(),
	} as unknown as BifrostClient
	return new AppKeyBifrostSync(mockClient)
}

describe('RevokeAppKeyService', () => {
	let service: RevokeAppKeyService
	let db: MemoryDatabaseAccess
	let appKeyRepo: AppApiKeyRepository

	beforeEach(async () => {
		db = new MemoryDatabaseAccess()
		appKeyRepo = new AppApiKeyRepository(db)
		const orgRepo = new OrganizationRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)
		const sync = createMockSync()
		service = new RevokeAppKeyService(appKeyRepo, orgAuth, sync)

		const org = Organization.create('org-1', 'Test Org', 'test')
		await orgRepo.save(org)
		const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
		await memberRepo.save(member)

		const key = await AppApiKey.create({
			id: 'appkey-revoke',
			orgId: 'org-1',
			issuedByUserId: 'user-1',
			label: 'Revoke Test',
			bifrostVirtualKeyId: 'bfr-vk-revoke',
			rawKey: 'drp_app_revoke123',
		})
		await appKeyRepo.save(key.activate())
	})

	it('應成功撤銷 Key 並停用 Bifrost VK', async () => {
		const result = await service.execute({
			keyId: 'appkey-revoke',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
		})
		expect(result.success).toBe(true)
		const updated = await appKeyRepo.findById('appkey-revoke')
		expect(updated?.status).toBe('revoked')
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
			keyId: 'appkey-revoke',
			callerUserId: 'outsider',
			callerSystemRole: 'user',
		})
		expect(result.success).toBe(false)
		expect(result.error).toBe('NOT_ORG_MEMBER')
	})
})
