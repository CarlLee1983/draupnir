// src/Modules/Contract/Application/Services/CreateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { Contract } from '../../Domain/Aggregates/Contract'
import { ContractPresenter, type CreateContractRequest, type ContractResponse } from '../DTOs/ContractDTO'

export class CreateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(request: CreateContractRequest): Promise<ContractResponse> {
    try {
      if (request.callerSystemRole !== 'admin') {
        return { success: false, message: 'Only admins can create contracts', error: 'FORBIDDEN' }
      }

      const contract = Contract.create({
        targetType: request.targetType,
        targetId: request.targetId,
        terms: request.terms,
        createdBy: request.callerUserId,
      })

      await this.contractRepo.save(contract)

      return {
        success: true,
        message: 'Contract created successfully',
        data: ContractPresenter.fromEntity(contract),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Contract creation failed'
      return { success: false, message, error: message }
    }
  }
}
