import { and, desc, eq } from 'drizzle-orm'
import { getDrizzleInstance } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/config'
import { alertEvents } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/schema'
import { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'

export class DrizzleAlertEventRepository implements IAlertEventRepository {
  constructor(_db: unknown) {}

  async save(event: AlertEvent): Promise<void> {
    const db = getDrizzleInstance()
    await db.insert(alertEvents).values(event.toInsert() as never)
  }

  async findByOrgAndMonth(orgId: string, month: string): Promise<readonly AlertEvent[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select()
      .from(alertEvents)
      .where(and(eq(alertEvents.org_id, orgId), eq(alertEvents.month, month)))
      .orderBy(desc(alertEvents.created_at))

    return rows.map((row: Record<string, unknown>) => AlertEvent.fromDatabase(row))
  }

  async findById(id: string): Promise<AlertEvent | null> {
    const db = getDrizzleInstance()
    const rows = await db.select().from(alertEvents).where(eq(alertEvents.id, id)).limit(1)
    return rows[0] ? AlertEvent.fromDatabase(rows[0] as Record<string, unknown>) : null
  }

  async listByOrg(
    orgId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<readonly AlertEvent[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select()
      .from(alertEvents)
      .where(eq(alertEvents.org_id, orgId))
      .orderBy(desc(alertEvents.created_at))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0)

    return rows.map((row: Record<string, unknown>) => AlertEvent.fromDatabase(row))
  }
}
