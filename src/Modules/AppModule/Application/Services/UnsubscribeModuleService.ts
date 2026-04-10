// src/Modules/AppModule/Application/Services/UnsubscribeModuleService.ts
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { ModuleAccessRevoked } from '../../Domain/Events/ModuleAccessRevoked'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { ModuleSubscriptionPresenter, type ModuleResponse } from '../DTOs/AppModuleDTO'

export class UnsubscribeModuleService {
  constructor(private readonly subscriptionRepo: IModuleSubscriptionRepository) {}

  async execute(orgId: string, moduleId: string): Promise<ModuleResponse> {
    try {
      const subscription = await this.subscriptionRepo.findByOrgAndModule(orgId, moduleId)
      if (!subscription) {
        return { success: false, message: '訂閱不存在', error: 'NOT_FOUND' }
      }
      if (!subscription.isActive()) {
        return { success: false, message: '訂閱已非啟用狀態', error: 'NOT_ACTIVE' }
      }

      const cancelled = subscription.cancel()
      await this.subscriptionRepo.update(cancelled)

      await DomainEventDispatcher.getInstance().dispatch(
        new ModuleAccessRevoked(subscription.id, orgId, moduleId, '使用者取消訂閱'),
      )

      return {
        success: true,
        message: '已取消訂閱',
        data: ModuleSubscriptionPresenter.fromEntity(cancelled),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '取消訂閱失敗'
      return { success: false, message, error: message }
    }
  }
}
