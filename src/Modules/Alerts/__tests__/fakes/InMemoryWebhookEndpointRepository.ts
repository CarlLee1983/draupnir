import { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'

export class InMemoryWebhookEndpointRepository implements IWebhookEndpointRepository {
  private readonly byId = new Map<string, WebhookEndpoint>()

  async findById(id: string): Promise<WebhookEndpoint | null> {
    return this.byId.get(id) ?? null
  }

  async findByOrg(orgId: string): Promise<WebhookEndpoint[]> {
    return [...this.byId.values()].filter((e) => e.orgId === orgId)
  }

  async findActiveByOrg(orgId: string): Promise<WebhookEndpoint[]> {
    return [...this.byId.values()].filter((e) => e.orgId === orgId && e.active)
  }

  async countByOrg(orgId: string): Promise<number> {
    return [...this.byId.values()].filter((e) => e.orgId === orgId).length
  }

  async save(endpoint: WebhookEndpoint): Promise<void> {
    this.byId.set(endpoint.id, endpoint)
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id)
  }

  all(): WebhookEndpoint[] {
    return [...this.byId.values()]
  }

  seed(...endpoints: WebhookEndpoint[]): void {
    for (const e of endpoints) {
      this.byId.set(e.id, e)
    }
  }
}
