import type { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import type { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'

export class GetAlertHistoryService {
  constructor(
    private readonly deps: {
      eventRepo: IAlertEventRepository
      deliveryRepo: IAlertDeliveryRepository
    },
  ) {}

  async list(
    orgId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<Array<{ event: AlertEvent; deliveries: readonly AlertDelivery[] }>> {
    const events = [...(await this.deps.eventRepo.listByOrg(orgId, opts))]
    events.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))

    const histories = await Promise.all(
      events.map(async (event) => ({
        event,
        deliveries: await this.deps.deliveryRepo.findByAlertEventId(event.id),
      })),
    )

    histories.sort(
      (left, right) => Date.parse(right.event.createdAt) - Date.parse(left.event.createdAt),
    )
    return histories
  }
}
