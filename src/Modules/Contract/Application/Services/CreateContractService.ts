// src/Modules/Contract/Application/Services/CreateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { Contract } from '../../Domain/Aggregates/Contract'
import { ContractPresenter, type CreateContractRequest, type ContractResponse } from '../DTOs/ContractDTO'

export class CreateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(request: CreateContractRequest): Promise<ContractResponse> {
    try {
      if (request.callerSystemRole !== 'admin') {
        return { success: false, message: '僅管理者可建立合約', error: 'FORBIDDEN' }
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
        message: '合約建立成功',
        data: ContractPresenter.fromEntity(contract),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '建立合約失敗'
      return { success: false, message, error: message }
    }
  }
}
