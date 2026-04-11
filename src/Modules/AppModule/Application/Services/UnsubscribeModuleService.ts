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
        return { success: false, message: 'Subscription not found', error: 'NOT_FOUND' }
      }
      if (!subscription.isActive()) {
        return { success: false, message: 'Subscription is not active', error: 'NOT_ACTIVE' }
      }

      const cancelled = subscription.cancel()
      await this.subscriptionRepo.update(cancelled)

      await DomainEventDispatcher.getInstance().dispatch(
        new ModuleAccessRevoked(subscription.id, orgId, moduleId, 'User unsubscribed'),
      )

      return {
        success: true,
        message: 'Unsubscribed successfully',
        data: ModuleSubscriptionPresenter.fromEntity(cancelled),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to unsubscribe module'
      return { success: false, message, error: message }
    }
  }
}
