// src/Modules/Contract/Application/Services/UpdateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { UpdateContractRequest, ContractResponse } from '../DTOs/ContractDTO'

export class UpdateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(request: UpdateContractRequest): Promise<ContractResponse> {
    try {
      if (request.callerSystemRole !== 'admin') {
        return { success: false, message: '僅管理者可修改合約', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(request.contractId)
      if (!contract) {
        return { success: false, message: '合約不存在', error: 'NOT_FOUND' }
      }

      const updated = contract.updateTerms(request.terms)
      await this.contractRepo.update(updated)

      return {
        success: true,
        message: '合約已更新',
        data: updated.toDTO(),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新合約失敗'
      return { success: false, message, error: message }
    }
  }
}
