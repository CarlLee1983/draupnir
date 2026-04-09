// src/Modules/Contract/Domain/Services/ContractEnforcementService.ts
import type { Contract } from '../Aggregates/Contract'

export class ContractEnforcementService {
  checkModuleAccess(contract: Contract | null, moduleName: string): { allowed: boolean; reason?: string } {
    if (!contract) {
      return { allowed: false, reason: '無有效合約' }
    }
    if (!contract.isActive()) {
      return { allowed: false, reason: `合約狀態為 ${contract.status}，非 ACTIVE` }
    }
    if (!contract.hasModule(moduleName)) {
      return { allowed: false, reason: `模組 ${moduleName} 不在合約允許清單中` }
    }
    return { allowed: true }
  }
}
