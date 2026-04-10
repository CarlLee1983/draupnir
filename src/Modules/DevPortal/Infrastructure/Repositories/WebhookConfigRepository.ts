import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IWebhookConfigRepository } from '../../Domain/Repositories/IWebhookConfigRepository'
import { WebhookConfig } from '../../Domain/Entities/WebhookConfig'
import { WebhookConfigMapper } from '../Mappers/WebhookConfigMapper'

export class WebhookConfigRepository implements IWebhookConfigRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<WebhookConfig | null> {
    const row = await this.db.table('webhook_configs').where('id', '=', id).first()
    return row ? WebhookConfig.fromDatabase(row) : null
  }

  async findByApplicationId(applicationId: string): Promise<WebhookConfig[]> {
    const rows = await this.db
      .table('webhook_configs')
      .where('application_id', '=', applicationId)
      .select()
    return rows.map((row) => WebhookConfig.fromDatabase(row))
  }

  async findEnabledByApplicationId(applicationId: string): Promise<WebhookConfig[]> {
    const rows = await this.db
      .table('webhook_configs')
      .where('application_id', '=', applicationId)
      .where('enabled', '=', true)
      .select()
    return rows.map((row) => WebhookConfig.fromDatabase(row))
  }

  async findByApplicationIdAndEventType(
    applicationId: string,
    eventType: string,
  ): Promise<WebhookConfig | null> {
    const row = await this.db
      .table('webhook_configs')
      .where('application_id', '=', applicationId)
      .where('event_type', '=', eventType)
      .first()
    return row ? WebhookConfig.fromDatabase(row) : null
  }

  async save(config: WebhookConfig): Promise<void> {
    await this.db.table('webhook_configs').insert(WebhookConfigMapper.toDatabaseRow(config))
  }

  async update(config: WebhookConfig): Promise<void> {
    await this.db
      .table('webhook_configs')
      .where('id', '=', config.id)
      .update(WebhookConfigMapper.toDatabaseRow(config))
  }

  async delete(id: string): Promise<void> {
    await this.db.table('webhook_configs').where('id', '=', id).delete()
  }

  async deleteByApplicationId(applicationId: string): Promise<void> {
    await this.db.table('webhook_configs').where('application_id', '=', applicationId).delete()
  }
}
