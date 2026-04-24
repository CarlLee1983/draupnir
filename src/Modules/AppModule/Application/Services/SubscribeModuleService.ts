// src/Modules/AppModule/Application/Services/SubscribeModuleService.ts
/**
 * SubscribeModuleService
 * Application service: handles organization module subscription requests.
 *
 * Responsibilities:
 * - Validate module existence and status
 * - Prevent duplicate active subscriptions
 * - Register new module-organization associations
 * - Dispatch domain events for downstream side effects
 */

import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
import { ModuleSubscribed } from '../../Domain/Events/ModuleSubscribed'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import {
  type ModuleResponse,
  ModuleSubscriptionPresenter,
  type SubscribeModuleRequest,
} from '../DTOs/AppModuleDTO'

/**
 * Service facilitating the subscription of organizations to functional modules.
 */
export class SubscribeModuleService {
  constructor(
    private readonly moduleRepo: IAppModuleRepository,
    private readonly subscriptionRepo: IModuleSubscriptionRepository,
  ) {}

  /**
   * Executes the module subscription process.
   */
  async execute(request: SubscribeModuleRequest): Promise<ModuleResponse> {
    try {
      const module = await this.moduleRepo.findById(request.moduleId)
      if (!module) {
        return { success: false, message: 'Module not found', error: 'MODULE_NOT_FOUND' }
      }
      if (!module.isActive()) {
        return {
          success: false,
          message: 'Module is currently disabled',
          error: 'MODULE_DEPRECATED',
        }
      }

      const existing = await this.subscriptionRepo.findByOrgAndModule(
        request.orgId,
        request.moduleId,
      )
      if (existing?.isActive()) {
        return {
          success: false,
          message: 'Already subscribed to this module',
          error: 'ALREADY_SUBSCRIBED',
        }
      }

      const subscription = ModuleSubscription.create(request.orgId, request.moduleId)
      await this.subscriptionRepo.save(subscription)

      await DomainEventDispatcher.getInstance().dispatch(
        new ModuleSubscribed(subscription.id, request.orgId, request.moduleId),
      )

      return {
        success: true,
        message: 'Module subscribed successfully',
        data: ModuleSubscriptionPresenter.fromEntity(subscription),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Subscription failed'
      return { success: false, message, error: message }
    }
  }
}
