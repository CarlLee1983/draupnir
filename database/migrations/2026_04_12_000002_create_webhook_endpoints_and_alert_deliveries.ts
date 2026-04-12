/**
 * Migration: 建立 webhook_endpoints 與 alert_deliveries
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateWebhookEndpointsAndAlertDeliveries implements Migration {
  async up(): Promise<void> {
    // CREATE TABLE webhook_endpoints
    await Schema.create('webhook_endpoints', (table) => {
      table.string('id').primary()
      table.string('org_id')
      table.text('url')
      table.text('secret')
      table.boolean('active').default(true)
      table.text('description').nullable()
      table.timestamp('created_at')
      table.timestamp('last_success_at').nullable()
      table.timestamp('last_failure_at').nullable()

      table.index(['org_id'])
      table.index(['org_id', 'active'])
    })

    // CREATE TABLE alert_deliveries
    await Schema.create('alert_deliveries', (table) => {
      table.string('id').primary()
      table.string('alert_event_id')
      table.string('channel')
      table.string('target')
      table.text('target_url').nullable()
      table.string('status')
      table.integer('attempts').default(0)
      table.integer('status_code').nullable()
      table.text('error_message').nullable()
      table.timestamp('dispatched_at')
      table.timestamp('delivered_at').nullable()
      table.timestamp('created_at')

      table.index(['alert_event_id'])
      table.index(['channel', 'target'])
      table.index(['alert_event_id', 'channel', 'target', 'status'], 'idx_alert_deliveries_dedup')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('alert_deliveries')
    await Schema.dropIfExists('webhook_endpoints')
  }
}
