// src/Modules/Contract/Application/Services/ListContractsService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { ContractListResponse } from '../DTOs/ContractDTO'

export class ListContractsService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(targetId: string, callerRole: string): Promise<ContractListResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: '僅管理者可檢視合約列表', error: 'FORBIDDEN' }
      }

      const contracts = await this.contractRepo.findByTargetId(targetId)
      return {
        success: true,
        message: '查詢成功',
        data: contracts.map((c) => c.toDTO()),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
