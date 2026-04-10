// src/Modules/Contract/Application/Services/ActivateContractService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractActivated } from '../../Domain/Events/ContractActivated'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { ContractPresenter, type ContractResponse } from '../DTOs/ContractDTO'

export class ActivateContractService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(contractId: string, callerRole: string): Promise<ContractResponse> {
    try {
      if (callerRole !== 'admin') {
        return { success: false, message: '僅管理者可啟用合約', error: 'FORBIDDEN' }
      }

      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return { success: false, message: '合約不存在', error: 'NOT_FOUND' }
      }

      const activated = contract.activate()
      await this.contractRepo.update(activated)

      await DomainEventDispatcher.getInstance().dispatch(
        new ContractActivated(activated.id, activated.targetType, activated.targetId),
      )

      return {
        success: true,
        message: '合約已啟用',
        data: ContractPresenter.fromEntity(activated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '啟用合約失敗'
      return { success: false, message, error: message }
    }
  }
}
