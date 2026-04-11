// src/Modules/Contract/Application/Services/RenewContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { Contract } from '../../Domain/Aggregates/Contract'
import type { ContractTermProps } from '../../Domain/Entities/ContractTerm'
import { ContractPresenter, type ContractResponse } from '../DTOs/ContractDTO'

/**
 * Renews an active contract for admin callers by expiring the old aggregate and saving a new activated one.
 */
export class RenewContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  /**
   * Renews the contract identified by `contractId` with `newTerms` when the caller is an admin.
   */
  async execute(
    contractId: string,
    newTerms: ContractTermProps,
    callerUserId: string,
    callerRole: string,
  ): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: 'Only admins can renew contracts', error: 'FORBIDDEN' }
      }

      const oldContract = await this.contractRepo.findById(contractId)
      if (!oldContract) {
        return { success: false, message: 'Contract not found', error: 'NOT_FOUND' }
      }

      if (!oldContract.isActive()) {
        return { success: false, message: 'Only ACTIVE contracts can be renewed', error: 'INVALID_STATUS' }
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
        message: 'Contract renewed successfully',
        data: ContractPresenter.fromEntity(newContract),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Contract renewal failed'
      return { success: false, message, error: message }
    }
  }
}
