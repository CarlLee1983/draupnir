/**
 * Migration: Denormalize alert_deliveries with org_id / month / tier
 *
 * Eliminates JOIN on alert_events for existsSent / listByOrg queries by
 * copying the relevant fields directly into each delivery row.
 *
 * SQLite cannot add NOT NULL columns without defaults in a single ALTER TABLE.
 * Pattern used:
 *   1. Add nullable columns (via Schema.table with default empty string)
 *   2. Backfill from alert_events JOIN via DB.raw
 *   3. Create composite index via DB.raw for existsSent query shape
 *
 * Future writes supply these values from the parent AlertEvent at insert time.
 */

import { type Migration, Schema, DB } from '@gravito/atlas'

export default class AddAlertDeliveriesDenorm implements Migration {
  async up(): Promise<void> {
    // Step 1: add columns with default '' (SQLite requires DEFAULT for ADD COLUMN)
    await Schema.table('alert_deliveries', (table) => {
      table.string('org_id').default('')
      table.string('month').default('')
      table.string('tier').default('')
    })

    // Step 2: backfill from alert_events
    await DB.raw(`
      UPDATE alert_deliveries
      SET
        org_id = (SELECT org_id FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id),
        month  = (SELECT month  FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id),
        tier   = (SELECT tier   FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id)
      WHERE alert_event_id IN (SELECT id FROM alert_events)
    `)

    // Step 3: composite index for existsSent query shape
    await DB.raw(`
      CREATE INDEX IF NOT EXISTS idx_alert_deliveries_org_month_tier
      ON alert_deliveries (org_id, month, tier)
    `)
  }

  async down(): Promise<void> {
    await DB.raw(`DROP INDEX IF EXISTS idx_alert_deliveries_org_month_tier`)
    await Schema.table('alert_deliveries', (table) => {
      table.dropColumn('org_id')
      table.dropColumn('month')
      table.dropColumn('tier')
    })
  }
}
