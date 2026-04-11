// src/Modules/Contract/Application/Services/HandleContractExpiryService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractExpiring } from '../../Domain/Events/ContractExpiring'
import { ContractExpired } from '../../Domain/Events/ContractExpired'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'

/**
 * Runs expiry workflows for scheduled jobs: notifies expiring contracts and persists expired ones.
 */
export class HandleContractExpiryService {
  constructor(private readonly contractRepo: IContractRepository) {}

  /**
   * Dispatches expiring and expired contract handling, returning how many of each were processed.
   */
  async execute(): Promise<{ expiring: number; expired: number }> {
    const dispatcher = DomainEventDispatcher.getInstance()
    let expiringCount = 0
    let expiredCount = 0

    const expiringContracts = await this.contractRepo.findExpiring(7)
    for (const contract of expiringContracts) {
      await dispatcher.dispatch(
        new ContractExpiring(contract.id, contract.targetType, contract.targetId, 7),
      )
      expiringCount++
    }

    const expiredContracts = await this.contractRepo.findExpired()
    for (const contract of expiredContracts) {
      const expired = contract.expire()
      await this.contractRepo.update(expired)
      await dispatcher.dispatch(
        new ContractExpired(expired.id, expired.targetType, expired.targetId),
      )
      expiredCount++
    }

    return { expiring: expiringCount, expired: expiredCount }
  }
}
