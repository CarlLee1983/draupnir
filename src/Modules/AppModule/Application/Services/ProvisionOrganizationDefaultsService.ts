import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { Contract } from '@/Modules/Contract/Domain/Aggregates/Contract'
import { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
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
  constructor(
    private readonly moduleRepo: IAppModuleRepository,
    private readonly contractRepo: IContractRepository,
    private readonly subRepo: IModuleSubscriptionRepository,
  ) {}

  async execute(orgId: string, createdByUserId: string): Promise<void> {
    await new EnsureCoreAppModulesService(this.moduleRepo).execute()

    const existing = await this.contractRepo.findActiveByTargetId(orgId)
    if (existing) return

    const contract = Contract.create({
      targetType: 'organization',
      targetId: orgId,
      terms: { ...DEFAULT_CONTRACT_TERMS },
      createdBy: createdByUserId,
    }).activate()
    await this.contractRepo.save(contract)

    for (const spec of CORE_APP_MODULE_SPECS) {
      const mod = await this.moduleRepo.findByName(spec.name)
      if (!mod) continue
      const sub = ModuleSubscription.create(orgId, mod.id)
      await this.subRepo.save(sub)
    }
  }
}
