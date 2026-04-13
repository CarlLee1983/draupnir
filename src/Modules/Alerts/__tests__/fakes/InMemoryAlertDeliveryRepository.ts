import type { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { DeliveryChannel } from '../../Domain/ValueObjects/DeliveryStatus'

export class InMemoryAlertDeliveryRepository implements IAlertDeliveryRepository {
  private rows: AlertDelivery[] = []

  async save(delivery: AlertDelivery): Promise<void> {
    const idx = this.rows.findIndex((r) => r.id === delivery.id)
    if (idx >= 0) {
      this.rows[idx] = delivery
    } else {
      this.rows.push(delivery)
    }
  }

  async findById(id: string): Promise<AlertDelivery | null> {
    return this.rows.find((r) => r.id === id) ?? null
  }

  async findByAlertEventId(alertEventId: string): Promise<AlertDelivery[]> {
    return this.rows.filter((r) => r.alertEventId === alertEventId)
  }

  async existsSent(params: {
    orgId: string
    month: string
    tier: string
    channel: DeliveryChannel
    target: string
  }): Promise<boolean> {
    return this.rows.some(
      (r) =>
        r.orgId === params.orgId &&
        r.month === params.month &&
        r.tier === params.tier &&
        r.channel === params.channel &&
        r.target === params.target &&
        r.status === 'sent',
    )
  }

  async listByOrg(
    orgId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<AlertDelivery[]> {
    const limit = opts?.limit ?? 50
    const offset = opts?.offset ?? 0
    return this.rows
      .filter((r) => r.orgId === orgId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(offset, offset + limit)
  }

  all(): AlertDelivery[] {
    return [...this.rows]
  }
}
