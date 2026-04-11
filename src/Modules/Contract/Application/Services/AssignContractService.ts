// src/Modules/Contract/Application/Services/AssignContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractPresenter, type AssignContractRequest, type ContractResponse } from '../DTOs/ContractDTO'

export class AssignContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

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
