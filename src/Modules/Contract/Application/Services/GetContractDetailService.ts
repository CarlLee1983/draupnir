// src/Modules/Contract/Application/Services/GetContractDetailService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractPresenter, type ContractResponse } from '../DTOs/ContractDTO'

export class GetContractDetailService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(contractId: string, callerRole: string): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: 'Only admins can view contracts', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return { success: false, message: 'Contract not found', error: 'NOT_FOUND' }
      }

      return {
        success: true,
        message: 'Query successful',
        data: ContractPresenter.fromEntity(contract),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
