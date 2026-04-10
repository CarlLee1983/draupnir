// src/Modules/AppModule/Application/Services/ListOrgSubscriptionsService.ts
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { ModuleSubscriptionPresenter, type ModuleListResponse } from '../DTOs/AppModuleDTO'

export class ListOrgSubscriptionsService {
  constructor(private readonly subscriptionRepo: IModuleSubscriptionRepository) {}

  async execute(orgId: string): Promise<ModuleListResponse> {
    try {
      const subscriptions = await this.subscriptionRepo.findActiveByOrgId(orgId)
      return {
        success: true,
        message: '查詢成功',
        data: subscriptions.map((s) => ModuleSubscriptionPresenter.fromEntity(s)),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
