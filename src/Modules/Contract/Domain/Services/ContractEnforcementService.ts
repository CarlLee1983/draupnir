// src/Modules/Contract/Domain/Services/ContractEnforcementService.ts
import type { Contract } from '../Aggregates/Contract'

export class ContractEnforcementService {
  checkModuleAccess(
    contract: Contract | null,
    moduleName: string,
  ): { allowed: boolean; reason?: string } {
    if (!contract) {
      return { allowed: false, reason: 'No valid contract' }
    }
    if (!contract.isActive()) {
      return { allowed: false, reason: `Contract status is ${contract.status}, not ACTIVE` }
    }
    if (!contract.hasModule(moduleName)) {
      return { allowed: false, reason: `Module ${moduleName} is not in the contract allowed list` }
    }
    return { allowed: true }
  }
}
