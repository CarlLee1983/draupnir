// src/Modules/Contract/Application/Services/RenewContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { Contract } from '../../Domain/Aggregates/Contract'
import type { ContractTermProps } from '../../Domain/Entities/ContractTerm'
import type { ContractResponse } from '../DTOs/ContractDTO'

export class RenewContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(
    contractId: string,
    newTerms: ContractTermProps,
    callerUserId: string,
    callerRole: string,
  ): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: '僅管理者可續約', error: 'FORBIDDEN' }
      }

      const oldContract = await this.contractRepo.findById(contractId)
      if (!oldContract) {
        return { success: false, message: '合約不存在', error: 'NOT_FOUND' }
      }

      if (!oldContract.isActive()) {
        return { success: false, message: '僅 ACTIVE 合約可續約', error: 'INVALID_STATUS' }
      }

      // 舊合約標記為 EXPIRED
      const expired = oldContract.expire()
      await this.contractRepo.update(expired)

      // 建立新合約並直接啟用
      const newContract = Contract.create({
        targetType: oldContract.targetType,
        targetId: oldContract.targetId,
        terms: newTerms,
        createdBy: callerUserId,
      }).activate()

      await this.contractRepo.save(newContract)

      return {
        success: true,
        message: '合約已續約',
        data: newContract.toDTO(),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '續約失敗'
      return { success: false, message, error: message }
    }
  }
}
