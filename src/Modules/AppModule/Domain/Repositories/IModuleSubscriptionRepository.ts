// src/Modules/AppModule/Domain/Repositories/IModuleSubscriptionRepository.ts
import type { ModuleSubscription } from '../Entities/ModuleSubscription'

export interface IModuleSubscriptionRepository {
  findById(id: string): Promise<ModuleSubscription | null>
  findByOrgAndModule(orgId: string, moduleId: string): Promise<ModuleSubscription | null>
  findActiveByOrgId(orgId: string): Promise<ModuleSubscription[]>
  save(subscription: ModuleSubscription): Promise<void>
  update(subscription: ModuleSubscription): Promise<void>
}
