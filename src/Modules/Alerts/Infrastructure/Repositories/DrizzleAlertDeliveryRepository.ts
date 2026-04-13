import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import { AlertDeliveryMapper } from '../Mappers/AlertDeliveryMapper'
import type { DeliveryChannel } from '../../Domain/ValueObjects/DeliveryStatus'

/**
 * Alert Delivery Repository — IDatabaseAccess Implementation
 *
 * Replaces the Drizzle-coupled version. Uses denormalized `org_id`, `month`,
 * and `tier` columns added in migration 2026_04_13_000002 to avoid JOINs
 * in `existsSent` and `listByOrg`.
 */
export class DrizzleAlertDeliveryRepository implements IAlertDeliveryRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(delivery: AlertDelivery): Promise<void> {
    await this.db
      .table('alert_deliveries')
      .insertOrIgnore(AlertDeliveryMapper.toPersistence(delivery) as unknown as Record<string, unknown>, {
        conflictTarget: 'id',
      })
  }

  async findById(id: string): Promise<AlertDelivery | null> {
    const row = await this.db.table('alert_deliveries').where('id', '=', id).first()
    return row ? AlertDeliveryMapper.toDomain(row) : null
  }

  async findByAlertEventId(alertEventId: string): Promise<AlertDelivery[]> {
    const rows = await this.db
      .table('alert_deliveries')
      .where('alert_event_id', '=', alertEventId)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => AlertDeliveryMapper.toDomain(row))
  }

  /**
   * Checks whether a delivery for the given org/month/tier/channel/target
   * has already been sent.
   *
   * Uses the denormalized `org_id`, `month`, and `tier` columns to avoid
   * any JOIN on alert_events.
   */
  async existsSent(params: {
    orgId: string
    month: string
    tier: string
    channel: DeliveryChannel
    target: string
  }): Promise<boolean> {
    const row = await this.db
      .table('alert_deliveries')
      .where('org_id', '=', params.orgId)
      .where('month', '=', params.month)
      .where('tier', '=', params.tier)
      .where('channel', '=', params.channel)
      .where('target', '=', params.target)
      .where('status', '=', 'sent')
      .first()
    return row !== null
  }

  /**
   * Lists deliveries for an organisation, ordered by most recent first.
   *
   * Uses the denormalized `org_id` column — no JOIN required.
   */
  async listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<AlertDelivery[]> {
    const rows = await this.db
      .table('alert_deliveries')
      .where('org_id', '=', orgId)
      .orderBy('created_at', 'DESC')
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0)
      .select()
    return rows.map((row) => AlertDeliveryMapper.toDomain(row))
  }
}
