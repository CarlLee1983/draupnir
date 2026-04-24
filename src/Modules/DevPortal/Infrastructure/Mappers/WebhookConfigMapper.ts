import type { WebhookConfig } from '../../Domain/Entities/WebhookConfig'

export const WebhookConfigMapper = {
  toDatabaseRow(entity: WebhookConfig): Record<string, unknown> {
    return {
      id: entity.id,
      application_id: entity.applicationId,
      event_type: entity.eventType,
      enabled: entity.enabled,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  },
}
