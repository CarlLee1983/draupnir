import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AcceptInvitationService } from '../Application/Services/AcceptInvitationService'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { UserProfileRepository } from '@/Modules/User/Infrastructure/Repositories/UserProfileRepository'
import { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'
import { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'

describe('AcceptInvitationService', () => {
	let acceptService: AcceptInvitationService
	let inviteService: InviteMemberService
	let registerService: RegisterUserService
	let orgId: string
	let managerId: string
	let newUserId: string

	beforeEach(async () => {
		const db = new MemoryDatabaseAccess()
		const authRepo = new AuthRepository(db)
		const profileRepo = new UserProfileRepository(db)
		const orgRepo = new OrganizationRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const invitationRepo = new OrganizationInvitationRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)

		registerService = new RegisterUserService(authRepo, profileRepo)
		const createOrgService = new CreateOrganizationService(orgRepo, memberRepo, authRepo, db, new ProvisionOrganizationDefaultsService())
		inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)
		acceptService = new AcceptInvitationService(invitationRepo, memberRepo, authRepo, db)

		const managerResult = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
		managerId = managerResult.data!.id
		const orgResult = await createOrgService.execute({ name: 'Test Org', managerUserId: managerId })
		orgId = orgResult.data!.id as string

		const newUserResult = await registerService.execute({ email: 'new@example.com', password: 'StrongPass123' })
		newUserId = newUserResult.data!.id
	})

	it('已註冊使用者應成功加入組織', async () => {
		const inviteResult = await inviteService.execute(orgId, managerId, 'user', { email: 'new@example.com' })
		const token = inviteResult.data!.token as string

		const result = await acceptService.execute(newUserId, { token })
		expect(result.success).toBe(true)
	})

	it('已屬於組織的使用者應被拒絕', async () => {
		const inviteResult = await inviteService.execute(orgId, managerId, 'user', { email: 'manager@example.com' })
		const token = inviteResult.data!.token as string

		const result = await acceptService.execute(managerId, { token })
		expect(result.success).toBe(false)
		expect(result.error).toBe('USER_ALREADY_IN_ORG')
	})

	it('email 不匹配的使用者不能接受邀請', async () => {
		const inviteResult = await inviteService.execute(orgId, managerId, 'user', { email: 'new@example.com' })
		const token = inviteResult.data!.token as string

		const otherResult = await registerService.execute({ email: 'other@example.com', password: 'StrongPass123' })
		const otherUserId = otherResult.data!.id

		const result = await acceptService.execute(otherUserId, { token })
		expect(result.success).toBe(false)
		expect(result.error).toBe('EMAIL_MISMATCH')
	})

	it('無效 Token 應回傳錯誤', async () => {
		const result = await acceptService.execute(newUserId, { token: 'invalid-token' })
		expect(result.success).toBe(false)
	})
})
