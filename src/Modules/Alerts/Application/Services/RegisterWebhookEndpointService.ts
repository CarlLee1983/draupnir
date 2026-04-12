import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import { WebhookUrl } from '../../Domain/ValueObjects/WebhookUrl'

export class RegisterWebhookEndpointService {
  constructor(
    private readonly deps: {
      repo: IWebhookEndpointRepository
      allowHttp?: boolean
    },
  ) {}

  async register(
    orgId: string,
    url: string,
    description: string | null = null,
  ): Promise<{ endpoint: WebhookEndpoint; plaintextSecret: string }> {
    const count = await this.deps.repo.countByOrg(orgId)
    if (count >= 5) {
      throw new Error('Maximum 5 webhook endpoints per organization')
    }

    const validatedUrl = await WebhookUrl.create(url, this.deps.allowHttp ?? false)
    const endpoint = WebhookEndpoint.create(orgId, validatedUrl.value, description)
    await this.deps.repo.save(endpoint)

    return {
      endpoint,
      plaintextSecret: endpoint.secret,
    }
  }
}
