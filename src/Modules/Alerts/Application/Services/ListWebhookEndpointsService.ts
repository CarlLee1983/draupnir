import type { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'

export class ListWebhookEndpointsService {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async list(orgId: string): Promise<readonly WebhookEndpoint[]> {
    return this.repo.findByOrg(orgId)
  }
}
