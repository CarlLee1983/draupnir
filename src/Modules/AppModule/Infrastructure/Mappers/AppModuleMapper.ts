// src/Modules/AppModule/Infrastructure/Mappers/AppModuleMapper.ts
import type { AppModule } from '../../Domain/Aggregates/AppModule'

export class AppModuleMapper {
  static toDatabaseRow(entity: AppModule): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      status: entity.status,
      created_at: entity.createdAt.toISOString(),
    }
  }
}
