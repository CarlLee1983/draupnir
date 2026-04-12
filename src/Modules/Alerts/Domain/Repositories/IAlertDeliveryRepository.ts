import type { AlertDelivery } from '../Entities/AlertDelivery'
import type { DeliveryChannel } from '../ValueObjects/DeliveryStatus'

export interface IAlertDeliveryRepository {
  save(delivery: AlertDelivery): Promise<void>
  findById(id: string): Promise<AlertDelivery | null>
  findByAlertEventId(alertEventId: string): Promise<AlertDelivery[]>
  existsSent(params: {
    orgId: string
    month: string
    tier: string
    channel: DeliveryChannel
    target: string
  }): Promise<boolean>
  listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<AlertDelivery[]>
}
