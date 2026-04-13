import type { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'

export class RotateWebhookSecretService {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async rotate(
    orgId: string,
    endpointId: string,
  ): Promise<{ endpoint: WebhookEndpoint; plaintextSecret: string }> {
    const endpoint = await this.repo.findById(endpointId)
    if (!endpoint || endpoint.orgId !== orgId) {
      throw new Error('Webhook endpoint not found')
    }

    const rotated = endpoint.rotateSecret()
    await this.repo.save(rotated)

    return {
      endpoint: rotated,
      plaintextSecret: rotated.secret,
    }
  }
}
