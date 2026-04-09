// database/migrations/2026_04_09_000006_create_quarantined_logs_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateQuarantinedLogsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('quarantined_logs', (table) => {
      table.string('id').primary()
      table.string('bifrost_log_id').unique()
      table.string('reason')
      table.text('raw_data')
      table.timestamp('created_at')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('quarantined_logs')
  }
}
