import type { UserProfileUpdated } from '../../Domain/Events/UserProfileUpdated'
import { ActivityLog } from '@/Shared/Domain/Entities/ActivityLog'
import type { IActivityLogRepository } from '@/Shared/Domain/Repositories/IActivityLogRepository'

/**
 * UserProfileAuditLogHandler
 * Responsible for recording a permanent audit trail of profile changes.
 * Uses the Domain Entity and Repository for persistence.
 */
export class UserProfileAuditLogHandler {
  constructor(private readonly activityLogRepo: IActivityLogRepository) {}

  async execute(event: UserProfileUpdated): Promise<void> {
    const { profileId, userId, fields, payload } = event

    // 1. Create a Domain Entity (encapsulates creation logic, IDs, and timestamps)
    const log = ActivityLog.create(
      userId,
      'profile.updated',
      profileId,
      {
        changed_fields: fields,
        ...payload,
      },
    )

    // 2. Persist using the Repository Port
    await this.activityLogRepo.save(log)
  }
}
