// src/Modules/Contract/Application/Services/TerminateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { ContractResponse } from '../DTOs/ContractDTO'

export class TerminateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(contractId: string, callerRole: string): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: '僅管理者可終止合約', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return { success: false, message: '合約不存在', error: 'NOT_FOUND' }
      }

      const terminated = contract.terminate()
      await this.contractRepo.update(terminated)

      return {
        success: true,
        message: '合約已終止',
        data: terminated.toDTO(),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '終止合約失敗'
      return { success: false, message, error: message }
    }
  }
}
