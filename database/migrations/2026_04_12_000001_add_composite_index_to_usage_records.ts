import { type Migration, Schema } from '@gravito/atlas'

export default class AddCompositeIndexToUsageRecords implements Migration {
  async up(): Promise<void> {
    await Schema.table('usage_records', (table) => {
      table.index(['org_id', 'occurred_at'])
    })
  }

  async down(): Promise<void> {
    // SQLite does not support DROP INDEX via Schema helper without full table recreation.
    // This migration is intentionally irreversible - the index is additive and harmless if left.
  }
}
