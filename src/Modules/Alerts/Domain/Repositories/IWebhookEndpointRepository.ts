import type { WebhookEndpoint } from '../Aggregates/WebhookEndpoint'

export interface IWebhookEndpointRepository {
  findById(id: string): Promise<WebhookEndpoint | null>
  findByOrg(orgId: string): Promise<WebhookEndpoint[]>
  findActiveByOrg(orgId: string): Promise<WebhookEndpoint[]>
  countByOrg(orgId: string): Promise<number>
  save(endpoint: WebhookEndpoint): Promise<void>
  delete(id: string): Promise<void>
}
