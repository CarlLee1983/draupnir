import type { Application } from '../../Domain/Aggregates/Application'

export class ApplicationMapper {
  static toDatabaseRow(entity: Application): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      org_id: entity.orgId,
      created_by_user_id: entity.createdByUserId,
      status: entity.status,
      webhook_url: entity.webhookUrl,
      webhook_secret: entity.webhookSecret,
      redirect_uris: JSON.stringify([...entity.redirectUris]),
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  }
}
