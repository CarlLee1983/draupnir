import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import { WebhookSecret } from '@/Foundation/Infrastructure/Services/Webhook/WebhookSecret'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'

export class TestWebhookEndpointService {
  constructor(
    private readonly deps: {
      repo: IWebhookEndpointRepository
      dispatcher: IWebhookDispatcher
    },
  ) {}

  async test(orgId: string, endpointId: string) {
    const endpoint = await this.deps.repo.findById(endpointId)
    if (!endpoint || endpoint.orgId !== orgId) {
      throw new Error('Webhook endpoint not found')
    }

    return this.deps.dispatcher.dispatch({
      url: endpoint.url,
      secret: WebhookSecret.fromExisting(endpoint.secret),
      eventType: 'alert.test',
      payload: {
        message: 'Test webhook from Draupnir',
        timestamp: new Date().toISOString(),
      },
    })
  }
}
