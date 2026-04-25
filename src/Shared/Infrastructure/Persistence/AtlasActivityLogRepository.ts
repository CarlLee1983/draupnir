import type { IDatabaseAccess } from '../IDatabaseAccess'
import { ActivityLog } from '../../Domain/Entities/ActivityLog'
import type { IActivityLogRepository } from '../../Domain/Repositories/IActivityLogRepository'

/**
 * AtlasActivityLogRepository Adapter
 * Implementation of IActivityLogRepository using the Atlas database adapter.
 */
export class AtlasActivityLogRepository implements IActivityLogRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(log: ActivityLog): Promise<void> {
    await this.db.table('activity_logs').insert({
      id: log.id,
      user_id: log.userId,
      action: log.action,
      target_id: log.targetId,
      metadata: JSON.stringify(log.metadata),
      created_at: log.createdAt,
      updated_at: log.updatedAt,
    })
  }

  async findByUserId(userId: string): Promise<ActivityLog[]> {
    const rows = await this.db
      .table('activity_logs')
      .where('user_id', '=', userId)
      .orderBy('created_at', 'DESC')
      .select()

    return rows.map((row) =>
      ActivityLog.reconstitute({
        id: row.id as string,
        userId: row.user_id as string,
        action: row.action as string,
        targetId: row.target_id as string,
        metadata: JSON.parse(row.metadata as string),
        createdAt: new Date(row.created_at as string | number),
        updatedAt: new Date(row.updated_at as string | number),
      }),
    )
  }
}
