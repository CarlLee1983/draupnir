// src/Modules/Contract/Application/Services/UpdateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import {
  ContractPresenter,
  type ContractResponse,
  type UpdateContractRequest,
} from '../DTOs/ContractDTO'

/**
 * Updates contract terms when the caller is an admin, then persists the aggregate.
 */
export class UpdateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  /**
   * Updates terms on the contract in `request` when the caller is an admin.
   */
  async execute(request: UpdateContractRequest): Promise<ContractResponse> {
    try {
      if (request.callerSystemRole !== 'admin') {
        return { success: false, message: 'Only admins can update contracts', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(request.contractId)
      if (!contract) {
        return { success: false, message: 'Contract not found', error: 'NOT_FOUND' }
      }

      const updated = contract.updateTerms(request.terms)
      await this.contractRepo.update(updated)

      return {
        success: true,
        message: 'Contract updated successfully',
        data: ContractPresenter.fromEntity(updated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Contract update failed'
      return { success: false, message, error: message }
    }
  }
}
