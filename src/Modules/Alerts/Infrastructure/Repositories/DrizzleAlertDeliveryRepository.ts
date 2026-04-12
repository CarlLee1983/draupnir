import { and, desc, eq } from 'drizzle-orm'
import { getDrizzleInstance } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/config'
import { alertDeliveries, alertEvents } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/schema'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import { AlertDeliveryMapper } from '../Mappers/AlertDeliveryMapper'

export class DrizzleAlertDeliveryRepository implements IAlertDeliveryRepository {
  constructor(_db: unknown) {}

  async save(delivery: AlertDelivery): Promise<void> {
    const db = getDrizzleInstance()
    await db
      .insert(alertDeliveries)
      .values(AlertDeliveryMapper.toPersistence(delivery))
      .onConflictDoNothing({ target: alertDeliveries.id })
  }

  async findById(id: string): Promise<AlertDelivery | null> {
    const db = getDrizzleInstance()
    const rows = await db.select().from(alertDeliveries).where(eq(alertDeliveries.id, id)).limit(1)
    return rows[0] ? AlertDeliveryMapper.toDomain(rows[0] as Record<string, unknown>) : null
  }

  async findByAlertEventId(alertEventId: string): Promise<AlertDelivery[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select()
      .from(alertDeliveries)
      .where(eq(alertDeliveries.alert_event_id, alertEventId))
      .orderBy(desc(alertDeliveries.created_at))

    return rows.map((row: Record<string, unknown>) => AlertDeliveryMapper.toDomain(row))
  }

  async existsSent(params: {
    orgId: string
    month: string
    tier: string
    channel: 'email' | 'webhook'
    target: string
  }): Promise<boolean> {
    const db = getDrizzleInstance()
    const rows = await db
      .select({ id: alertDeliveries.id })
      .from(alertDeliveries)
      .innerJoin(alertEvents, eq(alertDeliveries.alert_event_id, alertEvents.id))
      .where(
        and(
          eq(alertEvents.org_id, params.orgId),
          eq(alertEvents.month, params.month),
          eq(alertEvents.tier, params.tier),
          eq(alertDeliveries.channel, params.channel),
          eq(alertDeliveries.target, params.target),
          eq(alertDeliveries.status, 'sent'),
        ),
      )
      .limit(1)

    return rows.length > 0
  }

  async listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<AlertDelivery[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select({
        delivery: alertDeliveries,
        event: alertEvents,
      })
      .from(alertDeliveries)
      .innerJoin(alertEvents, eq(alertDeliveries.alert_event_id, alertEvents.id))
      .where(eq(alertEvents.org_id, orgId))
      .orderBy(desc(alertEvents.created_at), desc(alertDeliveries.created_at))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0)

    return rows.map((row: { delivery: Record<string, unknown> }) => AlertDeliveryMapper.toDomain(row.delivery))
  }
}
