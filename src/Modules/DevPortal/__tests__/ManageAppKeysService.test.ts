import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ManageAppKeysService } from '../Application/Services/ManageAppKeysService'
import { ApplicationRepository } from '../Infrastructure/Repositories/ApplicationRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { Application } from '../Domain/Aggregates/Application'

describe('ManageAppKeysService', () => {
	let service: ManageAppKeysService
	let db: MemoryDatabaseAccess
	let appRepo: ApplicationRepository
	let mockIssueAppKeyService: { execute: ReturnType<typeof vi.fn> }
	let mockRevokeAppKeyService: { execute: ReturnType<typeof vi.fn> }
	let mockListAppKeysService: { execute: ReturnType<typeof vi.fn> }

	beforeEach(async () => {
		db = new MemoryDatabaseAccess()
		appRepo = new ApplicationRepository(db)
		const orgRepo = new OrganizationRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)

		mockIssueAppKeyService = {
			execute: vi.fn().mockResolvedValue({
				success: true,
				message: 'App Key 配發成功',
				data: { id: 'appkey-1', rawKey: 'drp_app_test123' },
			}),
		}
		mockRevokeAppKeyService = {
			execute: vi.fn().mockResolvedValue({
				success: true,
				message: 'App Key 已撤銷',
			}),
		}
		mockListAppKeysService = {
			execute: vi.fn().mockResolvedValue({
				success: true,
				data: [{ id: 'appkey-1', label: 'Key 1' }],
			}),
		}

		service = new ManageAppKeysService(
			appRepo,
			orgAuth,
			mockIssueAppKeyService as never,
			mockRevokeAppKeyService as never,
			mockListAppKeysService as never,
		)

		const org = Organization.create('org-1', 'Test Org', 'test')
		await orgRepo.save(org)
		const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
		await memberRepo.save(member)

		const app = Application.create({
			id: 'app-1',
			name: 'Test App',
			description: 'Test',
			orgId: 'org-1',
			createdByUserId: 'user-1',
		})
		await appRepo.save(app)
	})

	it('應透過 issue action 配發新的 App Key', async () => {
		const result = await service.execute({
			applicationId: 'app-1',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
			action: 'issue',
			label: 'My SDK Key',
			scope: 'write',
		})
		expect(result.success).toBe(true)
		expect(mockIssueAppKeyService.execute).toHaveBeenCalledOnce()
	})

	it('應透過 revoke action 撤銷 App Key', async () => {
		const result = await service.execute({
			applicationId: 'app-1',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
			action: 'revoke',
			keyId: 'appkey-1',
		})
		expect(result.success).toBe(true)
		expect(mockRevokeAppKeyService.execute).toHaveBeenCalledOnce()
	})

	it('應透過 list action 列出 Application 的 Keys', async () => {
		const result = await service.execute({
			applicationId: 'app-1',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
			action: 'list',
		})
		expect(result.success).toBe(true)
		expect(mockListAppKeysService.execute).toHaveBeenCalledOnce()
	})

	it('不存在的 Application 應回傳錯誤', async () => {
		const result = await service.execute({
			applicationId: 'app-nonexist',
			callerUserId: 'user-1',
			callerSystemRole: 'user',
			action: 'list',
		})
		expect(result.success).toBe(false)
		expect(result.error).toBe('APP_NOT_FOUND')
	})

	it('非 Org 成員應回傳錯誤', async () => {
		const result = await service.execute({
			applicationId: 'app-1',
			callerUserId: 'outsider',
			callerSystemRole: 'user',
			action: 'list',
		})
		expect(result.success).toBe(false)
		expect(result.error).toBe('NOT_ORG_MEMBER')
	})
})
