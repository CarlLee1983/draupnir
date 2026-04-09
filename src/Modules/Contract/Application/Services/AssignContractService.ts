// src/Modules/Contract/Application/Services/AssignContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { AssignContractRequest, ContractResponse } from '../DTOs/ContractDTO'

export class AssignContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(request: AssignContractRequest): Promise<ContractResponse> {
    try {
      if (request.callerSystemRole !== 'admin') {
        return { success: false, message: '僅管理者可指派合約', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(request.contractId)
      if (!contract) {
        return { success: false, message: '合約不存在', error: 'NOT_FOUND' }
      }

      const assigned = contract.assignTo(request.targetType, request.targetId)
      await this.contractRepo.update(assigned)

      return {
        success: true,
        message: '合約已指派',
        data: assigned.toDTO(),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '指派合約失敗'
      return { success: false, message, error: message }
    }
  }
}
