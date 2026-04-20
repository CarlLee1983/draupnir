import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { Contract } from '@/Modules/Contract/Domain/Aggregates/Contract'
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { CORE_APP_MODULE_SPECS } from '../../Domain/CoreAppModules'
import { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { EnsureCoreAppModulesService } from './EnsureCoreAppModulesService'

const DEFAULT_CONTRACT_TERMS = {
  creditQuota: 0,
  allowedModules: [...CORE_APP_MODULE_SPECS.map((s) => s.name)],
  rateLimit: { rpm: 10_000, tpm: 10_000_000 },
  validityPeriod: { startDate: '2020-01-01', endDate: '2099-12-31' },
}

export class ProvisionOrganizationDefaultsService {
  constructor(
    private readonly moduleRepo: IAppModuleRepository,
    private readonly contractRepo: IContractRepository,
    private readonly subRepo: IModuleSubscriptionRepository,
    private readonly gatewayClient: ILLMGatewayClient,
    private readonly orgRepo: IOrganizationRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(orgId: string, createdByUserId: string): Promise<void> {
    await new EnsureCoreAppModulesService(this.moduleRepo).execute()

    // Bifrost Team binding — serialized per orgId via SELECT ... FOR UPDATE.
    // Re-reading inside the lock lets a second concurrent provisioner short-circuit
    // once the first has written gatewayTeamId. Bifrost POST is not retried
    // (see BifrostClient.createTeam), so a 5xx cannot double-create upstream.
    // Failure is logged, not re-thrown: contract/subscription creation must still
    // proceed so ops can compensate later without blocking onboarding.
    await this.db.transaction(async (tx) => {
      const orgRepo = this.orgRepo.withTransaction(tx)
      const org = await orgRepo.findByIdForUpdate(orgId)
      if (!org) return
      if (org.gatewayTeamId) return
      try {
        const team = await this.gatewayClient.ensureTeam({ name: org.slug })
        await orgRepo.update(org.attachGatewayTeam(team.id))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[ProvisionOrganizationDefaults] Failed to ensure Bifrost Team', {
          orgId,
          error: message,
        })
      }
    })

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
