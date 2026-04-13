import type { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'

export class UpdateWebhookEndpointService {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async update(
    orgId: string,
    endpointId: string,
    params: { active?: boolean; description?: string | null },
  ): Promise<WebhookEndpoint> {
    const endpoint = await this.repo.findById(endpointId)
    if (!endpoint || endpoint.orgId !== orgId) {
      throw new Error('Webhook endpoint not found')
    }

    let next = endpoint
    if (params.active === true) {
      next = next.activate()
    } else if (params.active === false) {
      next = next.deactivate()
    }

    if (params.description !== undefined) {
      next = next.withDescription(params.description)
    }

    await this.repo.save(next)
    return next
  }
}
