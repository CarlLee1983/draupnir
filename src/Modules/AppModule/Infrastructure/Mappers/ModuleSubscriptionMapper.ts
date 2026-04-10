// src/Modules/AppModule/Infrastructure/Mappers/ModuleSubscriptionMapper.ts
import type { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'

export class ModuleSubscriptionMapper {
  static toDatabaseRow(entity: ModuleSubscription): Record<string, unknown> {
    return {
      id: entity.id,
      org_id: entity.orgId,
      module_id: entity.moduleId,
      status: entity.status,
      subscribed_at: entity.subscribedAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  }
}
