import type { ActivityLog } from '../Entities/ActivityLog'

/**
 * IActivityLogRepository Port
 * Interface for persisting and retrieving activity logs.
 */
export interface IActivityLogRepository {
  /**
   * Persists an activity log entry.
   */
  save(log: ActivityLog): Promise<void>

  /**
   * Finds logs by user ID.
   */
  findByUserId(userId: string): Promise<ActivityLog[]>
}
