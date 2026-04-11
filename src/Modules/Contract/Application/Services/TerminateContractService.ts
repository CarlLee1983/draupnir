// src/Modules/Contract/Application/Services/TerminateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractPresenter, type ContractResponse } from '../DTOs/ContractDTO'

export class TerminateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(contractId: string, callerRole: string): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: 'Only admins can terminate contracts', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return { success: false, message: 'Contract not found', error: 'NOT_FOUND' }
      }

      const terminated = contract.terminate()
      await this.contractRepo.update(terminated)

      return {
        success: true,
        message: 'Contract terminated successfully',
        data: ContractPresenter.fromEntity(terminated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Contract termination failed'
      return { success: false, message, error: message }
    }
  }
}
