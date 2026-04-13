/**
 * Migration: 建立 alert_configs 與 alert_events
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateAlertConfigsAndAlertEvents implements Migration {
  async up(): Promise<void> {
    await Schema.create('alert_configs', (table) => {
      table.string('id').primary()
      table.string('org_id').unique()
      table.text('budget_usd')
      table.string('last_alerted_tier').nullable()
      table.string('last_alerted_at').nullable()
      table.string('last_alerted_month').nullable()
      table.timestamps()
    })

    await Schema.create('alert_events', (table) => {
      table.string('id').primary()
      table.string('org_id')
      table.string('tier')
      table.text('budget_usd')
      table.text('actual_cost_usd')
      table.text('percentage')
      table.string('month')
      table.text('recipients')
      table.timestamp('created_at')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('alert_events')
    await Schema.dropIfExists('alert_configs')
  }
}
