// database/migrations/2026_04_09_000003_create_usage_records_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateUsageRecordsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('usage_records', (table) => {
      table.string('id').primary()
      table.string('bifrost_log_id').unique()
      table.string('api_key_id')
      table.string('org_id')
      table.string('model')
      table.integer('input_tokens').default(0)
      table.integer('output_tokens').default(0)
      table.string('credit_cost').default('0')
      table.timestamp('occurred_at')
      table.timestamp('created_at')

      table.index(['org_id'])
      table.index(['api_key_id'])
      table.foreign('api_key_id').references('id').on('api_keys').onDelete('cascade')
      table.foreign('org_id').references('id').on('organizations').onDelete('cascade')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('usage_records')
  }
}
