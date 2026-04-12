import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'

export class DeleteWebhookEndpointService {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async delete(orgId: string, endpointId: string): Promise<void> {
    const endpoint = await this.repo.findById(endpointId)
    if (!endpoint || endpoint.orgId !== orgId) {
      return
    }
    await this.repo.delete(endpointId)
  }
}
