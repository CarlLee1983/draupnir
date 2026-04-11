// src/Modules/Contract/Application/Services/ActivateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractActivated } from '../../Domain/Events/ContractActivated'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { ContractPresenter, type ContractResponse } from '../DTOs/ContractDTO'

/**
 * Activates an existing contract when the caller is an admin, persists it, and dispatches domain events.
 */
export class ActivateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  /**
   * Activates the contract identified by `contractId` when the caller is an admin.
   */
  async execute(contractId: string, callerRole: string): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: 'Only admins can activate contracts', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return { success: false, message: 'Contract not found', error: 'NOT_FOUND' }
      }

      const activated = contract.activate()
      await this.contractRepo.update(activated)

      await DomainEventDispatcher.getInstance().dispatch(
        new ContractActivated(activated.id, activated.targetType, activated.targetId),
      )

      return {
        success: true,
        message: 'Contract activated successfully',
        data: ContractPresenter.fromEntity(activated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Contract activation failed'
      return { success: false, message, error: message }
    }
  }
}
