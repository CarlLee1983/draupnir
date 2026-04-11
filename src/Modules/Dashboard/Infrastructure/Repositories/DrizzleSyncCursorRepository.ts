import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ISyncCursorRepository, SyncCursor } from '../../Application/Ports/ISyncCursorRepository'

export class DrizzleSyncCursorRepository implements ISyncCursorRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async get(cursorType: string): Promise<SyncCursor | null> {
    const row = await this.db.table('sync_cursors').where('cursor_type', '=', cursorType).first()
    if (!row) return null
    return {
      cursorType: row.cursor_type as string,
      lastSyncedAt: (row.last_synced_at as string | null) ?? null,
      lastBifrostLogId: (row.last_bifrost_log_id as string | null) ?? null,
    }
  }

  async advance(
    cursorType: string,
    update: { readonly lastSyncedAt: string; readonly lastBifrostLogId?: string },
  ): Promise<void> {
    const existing = await this.get(cursorType)
    if (existing) {
      await this.db
        .table('sync_cursors')
        .where('cursor_type', '=', cursorType)
        .update({
          last_synced_at: update.lastSyncedAt,
          last_bifrost_log_id: update.lastBifrostLogId ?? null,
          updated_at: new Date().toISOString(),
        })
      return
    }

    await this.db.table('sync_cursors').insert({
      id: crypto.randomUUID(),
      cursor_type: cursorType,
      last_synced_at: update.lastSyncedAt,
      last_bifrost_log_id: update.lastBifrostLogId ?? null,
      updated_at: new Date().toISOString(),
    })
  }
}
