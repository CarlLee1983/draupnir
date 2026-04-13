/**
 * ISyncCursorRepository — Sync Cursor Persistence Port
 *
 * Tracks the high-water mark for incremental Bifrost log sync.
 * The cursor_type 'bifrost_logs' is the primary cursor used by BifrostSyncService.
 *
 * Implemented by DrizzleSyncCursorRepository in Infrastructure.
 */

export interface SyncCursor {
  readonly cursorType: string
  readonly lastSyncedAt: string | null
  readonly lastBifrostLogId: string | null
}

export interface ISyncCursorRepository {
  get(cursorType: string): Promise<SyncCursor | null>
  advance(
    cursorType: string,
    update: { readonly lastSyncedAt: string; readonly lastBifrostLogId?: string },
  ): Promise<void>
}
