// src/Modules/AppModule/Application/Services/SubscribeModuleService.ts
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
import { ModuleSubscribed } from '../../Domain/Events/ModuleSubscribed'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { SubscribeModuleRequest, ModuleResponse } from '../DTOs/AppModuleDTO'

export class SubscribeModuleService {
  constructor(
    private readonly moduleRepo: IAppModuleRepository,
    private readonly subscriptionRepo: IModuleSubscriptionRepository,
  ) {}

  async execute(request: SubscribeModuleRequest): Promise<ModuleResponse> {
    try {
      const module = await this.moduleRepo.findById(request.moduleId)
      if (!module) {
        return { success: false, message: '模組不存在', error: 'MODULE_NOT_FOUND' }
      }
      if (!module.isActive()) {
        return { success: false, message: '模組已停用', error: 'MODULE_DEPRECATED' }
      }

      const existing = await this.subscriptionRepo.findByOrgAndModule(request.orgId, request.moduleId)
      if (existing && existing.isActive()) {
        return { success: false, message: '已訂閱此模組', error: 'ALREADY_SUBSCRIBED' }
      }

      const subscription = ModuleSubscription.create(request.orgId, request.moduleId)
      await this.subscriptionRepo.save(subscription)

      await DomainEventDispatcher.getInstance().dispatch(
        new ModuleSubscribed(subscription.id, request.orgId, request.moduleId),
      )

      return {
        success: true,
        message: '模組訂閱成功',
        data: subscription.toDTO(),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '訂閱失敗'
      return { success: false, message, error: message }
    }
  }
}
