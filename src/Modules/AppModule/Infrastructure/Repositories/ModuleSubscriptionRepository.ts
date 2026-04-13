// src/Modules/AppModule/Infrastructure/Repositories/ModuleSubscriptionRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { ModuleSubscriptionMapper } from '../Mappers/ModuleSubscriptionMapper'

export class ModuleSubscriptionRepository implements IModuleSubscriptionRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<ModuleSubscription | null> {
    const row = await this.db.table('module_subscriptions').where('id', '=', id).first()
    return row ? ModuleSubscription.fromDatabase(row) : null
  }

  async findByOrgAndModule(orgId: string, moduleId: string): Promise<ModuleSubscription | null> {
    const row = await this.db
      .table('module_subscriptions')
      .where('org_id', '=', orgId)
      .where('module_id', '=', moduleId)
      .first()
    return row ? ModuleSubscription.fromDatabase(row) : null
  }

  async findActiveByOrgId(orgId: string): Promise<ModuleSubscription[]> {
    const rows = await this.db
      .table('module_subscriptions')
      .where('org_id', '=', orgId)
      .where('status', '=', 'active')
      .select()
    return rows.map((row) => ModuleSubscription.fromDatabase(row))
  }

  async save(subscription: ModuleSubscription): Promise<void> {
    await this.db
      .table('module_subscriptions')
      .insert(ModuleSubscriptionMapper.toDatabaseRow(subscription))
  }

  async update(subscription: ModuleSubscription): Promise<void> {
    await this.db
      .table('module_subscriptions')
      .where('id', '=', subscription.id)
      .update(ModuleSubscriptionMapper.toDatabaseRow(subscription))
  }
}
