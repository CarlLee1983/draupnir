import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { UserProfileRepository } from '@/Modules/User/Infrastructure/Repositories/UserProfileRepository'
import { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'

describe('InviteMemberService', () => {
	let inviteService: InviteMemberService
	let orgId: string
	let managerId: string

	beforeEach(async () => {
		const db = new MemoryDatabaseAccess()
		const authRepo = new AuthRepository(db)
		const profileRepo = new UserProfileRepository(db)
		const orgRepo = new OrganizationRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const invitationRepo = new OrganizationInvitationRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)

		const createOrgService = new CreateOrganizationService(orgRepo, memberRepo, authRepo, db)
		inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)

		const registerService = new RegisterUserService(authRepo, profileRepo)
		const userResult = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
		managerId = userResult.data!.id

		const orgResult = await createOrgService.execute({ name: 'Test Org', managerUserId: managerId })
		orgId = orgResult.data!.id as string
	})

	it('應成功產生邀請連結', async () => {
		const result = await inviteService.execute(orgId, managerId, 'user', { email: 'new@example.com' })
		expect(result.success).toBe(true)
		expect(result.data?.token).toBeTruthy()
		expect(result.data?.expiresAt).toBeTruthy()
	})

	it('不存在的組織應回傳錯誤', async () => {
		const result = await inviteService.execute('nonexistent', managerId, 'user', { email: 'new@example.com' })
		expect(result.success).toBe(false)
	})

	it('空的 email 應回傳錯誤', async () => {
		const result = await inviteService.execute(orgId, managerId, 'user', { email: '' })
		expect(result.success).toBe(false)
	})
})
