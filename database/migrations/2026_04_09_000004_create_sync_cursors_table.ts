// database/migrations/2026_04_09_000004_create_sync_cursors_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateSyncCursorsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('sync_cursors', (table) => {
      table.string('id').primary()
      table.string('cursor_type').unique()
      table.timestamp('last_synced_at').nullable()
      table.string('last_bifrost_log_id').nullable()
      table.timestamp('updated_at')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('sync_cursors')
  }
}
