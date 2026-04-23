import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AtlasSyncCursorRepository } from '../Infrastructure/Repositories/AtlasSyncCursorRepository'

describe('AtlasSyncCursorRepository', () => {
  let db: MemoryDatabaseAccess
  let repo: AtlasSyncCursorRepository

  beforeEach(() => {
    db = new MemoryDatabaseAccess()
    repo = new AtlasSyncCursorRepository(db)
  })

  it('get returns null when sync_cursors is empty', async () => {
    await expect(repo.get('bifrost_logs')).resolves.toBeNull()
  })

  it('advance inserts a cursor row and get returns it', async () => {
    await repo.advance('bifrost_logs', { lastSyncedAt: '2026-01-01T00:00:00Z' })

    const cursor = await repo.get('bifrost_logs')
    expect(cursor).toEqual({
      cursorType: 'bifrost_logs',
      lastSyncedAt: '2026-01-01T00:00:00Z',
      lastBifrostLogId: null,
    })
  })

  it('advance twice updates the existing cursor instead of inserting a duplicate', async () => {
    await repo.advance('bifrost_logs', { lastSyncedAt: '2026-01-01T00:00:00Z' })
    await repo.advance('bifrost_logs', { lastSyncedAt: '2026-01-02T00:00:00Z' })

    expect(await db.table('sync_cursors').count()).toBe(1)
    expect(await repo.get('bifrost_logs')).toEqual({
      cursorType: 'bifrost_logs',
      lastSyncedAt: '2026-01-02T00:00:00Z',
      lastBifrostLogId: null,
    })
  })

  it('advance stores lastBifrostLogId', async () => {
    await repo.advance('bifrost_logs', {
      lastSyncedAt: '2026-01-01T00:00:00Z',
      lastBifrostLogId: 'log-123',
    })

    expect(await repo.get('bifrost_logs')).toEqual({
      cursorType: 'bifrost_logs',
      lastSyncedAt: '2026-01-01T00:00:00Z',
      lastBifrostLogId: 'log-123',
    })
  })

  it('get returns null for unknown cursorType even after other cursors are set', async () => {
    await repo.advance('bifrost_logs', { lastSyncedAt: '2026-01-01T00:00:00Z' })
    await expect(repo.get('another_cursor')).resolves.toBeNull()
  })
})
