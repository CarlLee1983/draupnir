import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RemoveMemberService } from '../Application/Services/RemoveMemberService'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { AcceptInvitationService } from '../Application/Services/AcceptInvitationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { UserProfileRepository } from '@/Modules/User/Infrastructure/Repositories/UserProfileRepository'
import { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'
import { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'

describe('RemoveMemberService', () => {
	let removeService: RemoveMemberService
	let orgId: string
	let managerId: string
	let memberId: string

	beforeEach(async () => {
		const db = new MemoryDatabaseAccess()
		const authRepo = new AuthRepository(db)
		const profileRepo = new UserProfileRepository(db)
		const orgRepo = new OrganizationRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		const invitationRepo = new OrganizationInvitationRepository(db)
		const orgAuth = new OrgAuthorizationHelper(memberRepo)

		const registerService = new RegisterUserService(authRepo, profileRepo)
		const createOrgService = new CreateOrganizationService(orgRepo, memberRepo, authRepo, db, new ProvisionOrganizationDefaultsService())
		const inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)
		const acceptService = new AcceptInvitationService(invitationRepo, memberRepo, authRepo, db)
		removeService = new RemoveMemberService(memberRepo, orgAuth, db)

		const managerResult = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
		managerId = managerResult.data!.id

		const orgResult = await createOrgService.execute({ name: 'Test Org', managerUserId: managerId })
		orgId = orgResult.data!.id as string

		const memberResult = await registerService.execute({ email: 'member@example.com', password: 'StrongPass123' })
		memberId = memberResult.data!.id
		const inviteResult = await inviteService.execute(orgId, managerId, 'user', { email: 'member@example.com' })
		await acceptService.execute(memberId, { token: inviteResult.data!.token as string })
	})

	it('應成功移除成員', async () => {
		const result = await removeService.execute(orgId, memberId, managerId, 'user')
		expect(result.success).toBe(true)
	})

	it('不能移除自己', async () => {
		const result = await removeService.execute(orgId, managerId, managerId, 'user')
		expect(result.success).toBe(false)
		expect(result.error).toBe('CANNOT_REMOVE_SELF')
	})

	it('不能移除最後一個 Manager', async () => {
		const result = await removeService.execute(orgId, managerId, memberId, 'admin')
		expect(result.success).toBe(false)
		expect(result.error).toBe('CANNOT_REMOVE_LAST_MANAGER')
	})
})
