// database/migrations/2026_04_09_000007_add_suspension_fields_to_api_keys.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class AddSuspensionFieldsToApiKeys implements Migration {
  async up(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.string('suspension_reason').nullable()
      table.text('pre_freeze_rate_limit').nullable()
      table.timestamp('suspended_at').nullable()
    })
  }

  async down(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.dropColumn('suspension_reason')
      table.dropColumn('pre_freeze_rate_limit')
      table.dropColumn('suspended_at')
    })
  }
}
