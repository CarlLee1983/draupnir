import { expect, test, describe, beforeAll } from 'bun:test'
import { UserProfile } from '../Domain/Aggregates/UserProfile'
import { UserProfileAuditLogHandler } from '../Application/EventHandlers/UserProfileAuditLogHandler'
import { DB, Migrator } from '@gravito/atlas'
import { join } from 'path'
import { createAtlasDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Atlas/GravitoDatabaseAdapter'
import { AtlasActivityLogRepository } from '@/Shared/Infrastructure/Persistence/AtlasActivityLogRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

describe('UserProfileAuditLog Integration', () => {
  let dbAccess: IDatabaseAccess
  let activityLogRepo: AtlasActivityLogRepository

  beforeAll(async () => {
    // Setup in-memory SQLite for testing
    const testConfig = {
      default: 'sqlite',
      connections: {
        sqlite: {
          driver: 'sqlite',
          database: ':memory:'
        }
      }
    }
    DB.configure(testConfig as any)
    const connection = DB.getDefaultConnection()
    dbAccess = createAtlasDatabaseAccess()
    activityLogRepo = new AtlasActivityLogRepository(dbAccess)

    // Run migrations
    const migrator = new Migrator({
      path: join(process.cwd(), 'database/migrations'),
      connection
    })
    await migrator.run()
  })

  test('should persist audit log using repository when handler is executed', async () => {
    const handler = new UserProfileAuditLogHandler(activityLogRepo)
    
    const profile = UserProfile.createDefault('user-123', 'test@example.com')
    const updatedProfile = profile.updateProfile({
      displayName: 'New Name',
      timezone: 'Asia/Taipei'
    })

    const event = updatedProfile.domainEvents[0] as any
    
    await handler.execute(event)

    // Verify using the Repository (DDD way)
    const logs = await activityLogRepo.findByUserId('user-123')

    expect(logs.length).toBe(1)
    const log = logs[0]
    expect(log.action).toBe('profile.updated')
    expect(log.targetId).toBe(profile.id)
    
    expect(log.metadata.changed_fields).toContain('displayName')
    expect(log.metadata.changed_fields).toContain('timezone')
    expect(log.metadata.displayName).toBe('New Name')
  })
})
