import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { UserProfileRepository } from '@/Modules/User/Infrastructure/Repositories/UserProfileRepository'

describe('CreateOrganizationService', () => {
	let service: CreateOrganizationService
	let db: MemoryDatabaseAccess
	let managerId: string

	beforeEach(async () => {
		db = new MemoryDatabaseAccess()
		const authRepo = new AuthRepository(db)
		const profileRepo = new UserProfileRepository(db)
		const orgRepo = new OrganizationRepository(db)
		const memberRepo = new OrganizationMemberRepository(db)
		service = new CreateOrganizationService(orgRepo, memberRepo, authRepo, db)

		const registerService = new RegisterUserService(authRepo, profileRepo)
		const result = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
		managerId = result.data!.id
	})

	it('應成功建立 Organization 並指定 Manager', async () => {
		const result = await service.execute({
			name: 'CMG 科技',
			description: '科技公司',
			managerUserId: managerId,
		})
		expect(result.success).toBe(true)
		expect(result.data?.name).toBe('CMG 科技')
		expect(result.data?.slug).toBeTruthy()
	})

	it('不存在的 Manager 應回傳錯誤', async () => {
		const result = await service.execute({
			name: 'Test Org',
			managerUserId: 'nonexistent',
		})
		expect(result.success).toBe(false)
		expect(result.error).toBe('MANAGER_NOT_FOUND')
	})

	it('空名稱應回傳錯誤', async () => {
		const result = await service.execute({
			name: '',
			managerUserId: managerId,
		})
		expect(result.success).toBe(false)
	})

	it('重複的 slug 應回傳錯誤', async () => {
		await service.execute({ name: 'CMG', managerUserId: managerId })
		const authRepo = new AuthRepository(db)
		const profileRepo = new UserProfileRepository(db)
		const registerService = new RegisterUserService(authRepo, profileRepo)
		const result2 = await registerService.execute({ email: 'manager2@example.com', password: 'StrongPass123' })
		const result = await service.execute({ name: 'CMG', slug: 'cmg', managerUserId: result2.data!.id })
		expect(result.success).toBe(false)
		expect(result.error).toBe('SLUG_EXISTS')
	})
})
