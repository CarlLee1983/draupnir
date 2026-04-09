// src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { Contract } from '@/Modules/Contract/Domain/Aggregates/Contract'
import { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
import { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'
import { AppModuleRepository } from '../../Infrastructure/Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '../../Infrastructure/Repositories/ModuleSubscriptionRepository'
import { EnsureCoreAppModulesService } from './EnsureCoreAppModulesService'
import { CORE_APP_MODULE_SPECS } from '../../Domain/CoreAppModules'

const DEFAULT_CONTRACT_TERMS = {
	creditQuota: 1_000_000,
	allowedModules: [...CORE_APP_MODULE_SPECS.map((s) => s.name)],
	rateLimit: { rpm: 10_000, tpm: 10_000_000 },
	validityPeriod: { startDate: '2020-01-01', endDate: '2099-12-31' },
}

/**
 * 新組織建立後：確保內建模組存在、建立預設啟用合約、為內建模組建立訂閱。
 */
export class ProvisionOrganizationDefaultsService {
	async execute(db: IDatabaseAccess, orgId: string, createdByUserId: string): Promise<void> {
		const moduleRepo = new AppModuleRepository(db)
		await new EnsureCoreAppModulesService(moduleRepo).execute()

		const contractRepo = new ContractRepository(db)
		const existing = await contractRepo.findActiveByTargetId(orgId)
		if (existing) return

		const contract = Contract.create({
			targetType: 'organization',
			targetId: orgId,
			terms: { ...DEFAULT_CONTRACT_TERMS },
			createdBy: createdByUserId,
		}).activate()
		await contractRepo.save(contract)

		const subRepo = new ModuleSubscriptionRepository(db)
		for (const spec of CORE_APP_MODULE_SPECS) {
			const mod = await moduleRepo.findByName(spec.name)
			if (!mod) continue
			const sub = ModuleSubscription.create(orgId, mod.id)
			await subRepo.save(sub)
		}
	}
}
