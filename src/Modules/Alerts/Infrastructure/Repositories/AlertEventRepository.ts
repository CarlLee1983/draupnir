import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'

/**
 * Alert Event Repository — IDatabaseAccess Implementation
 *
 * Replaces the Drizzle-coupled version using the ORM-agnostic IDatabaseAccess port.
 */
export class AlertEventRepository implements IAlertEventRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(event: AlertEvent): Promise<void> {
    await this.db.table('alert_events').insert(event.toInsert())
  }

  async findByOrgAndMonth(orgId: string, month: string): Promise<readonly AlertEvent[]> {
    const rows = await this.db
      .table('alert_events')
      .where('org_id', '=', orgId)
      .where('month', '=', month)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => AlertEvent.fromDatabase(row))
  }

  async findById(id: string): Promise<AlertEvent | null> {
    const row = await this.db.table('alert_events').where('id', '=', id).first()
    return row ? AlertEvent.fromDatabase(row) : null
  }

  async listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<readonly AlertEvent[]> {
    const rows = await this.db
      .table('alert_events')
      .where('org_id', '=', orgId)
      .orderBy('created_at', 'DESC')
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0)
      .select()
    return rows.map((row) => AlertEvent.fromDatabase(row))
  }
}
