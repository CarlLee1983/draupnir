import type { WebhookConfig } from '../Entities/WebhookConfig'

export interface IWebhookConfigRepository {
  findById(id: string): Promise<WebhookConfig | null>
  findByApplicationId(applicationId: string): Promise<WebhookConfig[]>
  findEnabledByApplicationId(applicationId: string): Promise<WebhookConfig[]>
  findByApplicationIdAndEventType(
    applicationId: string,
    eventType: string,
  ): Promise<WebhookConfig | null>
  save(config: WebhookConfig): Promise<void>
  update(config: WebhookConfig): Promise<void>
  delete(id: string): Promise<void>
  deleteByApplicationId(applicationId: string): Promise<void>
}
