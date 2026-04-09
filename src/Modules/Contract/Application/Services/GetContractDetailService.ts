// src/Modules/Contract/Application/Services/GetContractDetailService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { ContractResponse } from '../DTOs/ContractDTO'

export class GetContractDetailService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(contractId: string, callerRole: string): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: '僅管理者可檢視合約', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return { success: false, message: '合約不存在', error: 'NOT_FOUND' }
      }

      return {
        success: true,
        message: '查詢成功',
        data: contract.toDTO(),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
