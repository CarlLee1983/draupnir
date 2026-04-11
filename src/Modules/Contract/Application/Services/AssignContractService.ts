// src/Modules/Contract/Application/Services/AssignContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractPresenter, type AssignContractRequest, type ContractResponse } from '../DTOs/ContractDTO'

/**
 * Reassigns a contract to another target when the caller is an admin, then persists it.
 */
export class AssignContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  /**
   * Assigns the contract in `request` to a new target when the caller is an admin.
   */
  async execute(request: AssignContractRequest): Promise<ContractResponse> {
    try {
      if (request.callerSystemRole !== 'admin') {
        return { success: false, message: 'Only admins can assign contracts', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(request.contractId)
      if (!contract) {
        return { success: false, message: 'Contract not found', error: 'NOT_FOUND' }
      }

      const assigned = contract.assignTo(request.targetType, request.targetId)
      await this.contractRepo.update(assigned)

      return {
        success: true,
        message: 'Contract assigned successfully',
        data: ContractPresenter.fromEntity(assigned),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Contract assignment failed'
      return { success: false, message, error: message }
    }
  }
}
