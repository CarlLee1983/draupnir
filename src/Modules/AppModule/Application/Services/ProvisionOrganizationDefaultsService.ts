import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { Contract } from '@/Modules/Contract/Domain/Aggregates/Contract'
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
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
  ) {}

  async execute(orgId: string, createdByUserId: string): Promise<void> {
    await new EnsureCoreAppModulesService(this.moduleRepo).execute()

    // Bifrost Team 建立放在 contract 短路之前，且使用 ensureTeam（以 name 為
    // 冪等鍵）。若首次 provisioning 時 gateway 故障，後續重跑能補建 Team。
    // 成功後把回傳的 team.id 寫回 Organization.gatewayTeamId，供建立虛擬 key
    // 時作為 team_id 綁定。失敗仍不阻斷合約/訂閱建立，僅 log。
    try {
      const team = await this.gatewayClient.ensureTeam({ name: orgId })
      const org = await this.orgRepo.findById(orgId)
      if (org && org.gatewayTeamId !== team.id) {
        await this.orgRepo.update(org.attachGatewayTeam(team.id))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[ProvisionOrganizationDefaults] Failed to ensure Bifrost Team', {
        orgId,
        error: message,
      })
    }

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
