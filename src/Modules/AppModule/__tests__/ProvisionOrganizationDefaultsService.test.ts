// src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts
import { describe, expect, test } from 'bun:test'
import { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ProvisionOrganizationDefaultsService } from '../Application/Services/ProvisionOrganizationDefaultsService'
import { AppModuleRepository } from '../Infrastructure/Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '../Infrastructure/Repositories/ModuleSubscriptionRepository'

describe('ProvisionOrganizationDefaultsService', () => {
  test('為組織建立啟用中合約與內建模組訂閱', async () => {
    const db = new MemoryDatabaseAccess()
    const moduleRepo = new AppModuleRepository(db)
    const contractRepo = new ContractRepository(db)
    const subRepo = new ModuleSubscriptionRepository(db)
    const service = new ProvisionOrganizationDefaultsService(moduleRepo, contractRepo, subRepo)
    await service.execute('org-new', 'user-1')

    const active = await contractRepo.findActiveByTargetId('org-new')
    expect(active).not.toBeNull()
    expect(active?.targetId).toBe('org-new')

    const dash = await moduleRepo.findByName('dashboard')
    expect(dash).not.toBeNull()

    const sub = await subRepo.findByOrgAndModule('org-new', dash!.id)
    expect(sub?.isActive()).toBe(true)
  })
})
