import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'

export class DrizzleAlertEventRepository implements IAlertEventRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(event: AlertEvent): Promise<void> {
    await this.db.table('alert_events').insert(event.toInsert())
  }

  async findByOrgAndMonth(orgId: string, month: string): Promise<readonly AlertEvent[]> {
    const rows = await this.db
      .table('alert_events')
      .where('org_id', '=', orgId)
      .where('month', '=', month)
      .select()

    return rows.map((row) => AlertEvent.fromDatabase(row))
  }
}
