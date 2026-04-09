// src/Modules/AppModule/Application/Services/CheckModuleAccessService.ts
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import { ContractEnforcementService } from '@/Modules/Contract/Domain/Services/ContractEnforcementService'

export interface ModuleAccessResult {
  allowed: boolean
  reason?: string
}

export class CheckModuleAccessService {
  private readonly enforcementService = new ContractEnforcementService()

  constructor(
    private readonly contractRepo: IContractRepository,
    private readonly subscriptionRepo: IModuleSubscriptionRepository,
    private readonly moduleRepo: IAppModuleRepository,
  ) {}

  async execute(orgId: string, moduleName: string): Promise<ModuleAccessResult> {
    // 1. 查詢模組是否存在
    const module = await this.moduleRepo.findByName(moduleName)
    if (!module || !module.isActive()) {
      return { allowed: false, reason: `模組 ${moduleName} 不存在或已停用` }
    }

    // 2. 檢查合約白名單
    const contract = await this.contractRepo.findActiveByTargetId(orgId)
    const contractCheck = this.enforcementService.checkModuleAccess(contract, moduleName)
    if (!contractCheck.allowed) {
      return contractCheck
    }

    // 3. 檢查訂閱狀態
    const subscription = await this.subscriptionRepo.findByOrgAndModule(orgId, module.id)
    if (!subscription || !subscription.isActive()) {
      return { allowed: false, reason: `組織未訂閱模組 ${moduleName}` }
    }

    return { allowed: true }
  }
}
