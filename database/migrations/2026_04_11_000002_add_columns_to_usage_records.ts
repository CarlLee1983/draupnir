import { type Migration, Schema } from '@gravito/atlas'

export default class AddColumnsToUsageRecords implements Migration {
  async up(): Promise<void> {
    await Schema.table('usage_records', (table) => {
      table.string('provider').nullable()
      table.integer('latency_ms').nullable()
      table.string('status').nullable()
    })
  }

  async down(): Promise<void> {
    // SQLite does not support DROP COLUMN without table recreation.
    // This migration is intentionally irreversible.
  }
}
