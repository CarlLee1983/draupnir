// src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts
import { describe, test, expect } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ProvisionOrganizationDefaultsService } from '../Application/Services/ProvisionOrganizationDefaultsService'
import { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'
import { AppModuleRepository } from '../Infrastructure/Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '../Infrastructure/Repositories/ModuleSubscriptionRepository'

describe('ProvisionOrganizationDefaultsService', () => {
	test('為組織建立啟用中合約與內建模組訂閱', async () => {
		const db = new MemoryDatabaseAccess()
		const service = new ProvisionOrganizationDefaultsService()
		await service.execute(db, 'org-new', 'user-1')

		const contractRepo = new ContractRepository(db)
		const active = await contractRepo.findActiveByTargetId('org-new')
		expect(active).not.toBeNull()
		expect(active?.targetId).toBe('org-new')

		const modRepo = new AppModuleRepository(db)
		const dash = await modRepo.findByName('dashboard')
		expect(dash).not.toBeNull()

		const subRepo = new ModuleSubscriptionRepository(db)
		const sub = await subRepo.findByOrgAndModule('org-new', dash!.id)
		expect(sub?.isActive()).toBe(true)
	})
})
