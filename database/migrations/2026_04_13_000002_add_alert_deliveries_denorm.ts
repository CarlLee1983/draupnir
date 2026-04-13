/**
 * Migration: Denormalize alert_deliveries with org_id / month / tier
 *
 * Eliminates JOIN on alert_events for existsSent / listByOrg queries by
 * copying the relevant fields directly into each delivery row.
 *
 * SQLite cannot add NOT NULL columns without defaults in a single ALTER TABLE.
 * Pattern used:
 *   1. Add columns with default '' (SQLite requires DEFAULT for ADD COLUMN)
 *   2. Backfill from alert_events via correlated subquery
 *   3. Verify no delivery row is left with empty denormalized fields —
 *      fail the migration loudly so orphans / missed rows are not masked
 *      behind the application-layer fallback
 *   4. Composite index for existsSent query shape
 *
 * Future writes supply these values from the parent AlertEvent at insert time,
 * and AlertDeliveryMapper / AlertDelivery.rehydrate reject empty values so any
 * future drift surfaces immediately rather than silently producing duplicate
 * sends or missing history entries.
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

    // Step 2: backfill from alert_events (COALESCE preserves '' for orphans so
    // verification in Step 3 surfaces them instead of failing here)
    await DB.raw(`
      UPDATE alert_deliveries
      SET
        org_id = COALESCE((SELECT org_id FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id), ''),
        month  = COALESCE((SELECT month  FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id), ''),
        tier   = COALESCE((SELECT tier   FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id), '')
    `)

    // Step 3: verify backfill is complete — reject if any row is still blank.
    // If this fails, data drift exists (orphan delivery or unpopulated event
    // row). Fix the data first rather than shipping a schema that the app
    // layer will reject at read time anyway.
    const missing = await DB.raw(
      `SELECT COUNT(*) AS count FROM alert_deliveries WHERE org_id = '' OR month = '' OR tier = ''`,
    )
    const count = Number(
      Array.isArray(missing) ? (missing[0] as { count?: unknown })?.count ?? 0 : (missing as { count?: unknown })?.count ?? 0,
    )
    if (count > 0) {
      throw new Error(
        `Migration aborted: ${count} alert_deliveries row(s) still have empty org_id/month/tier after backfill. ` +
          `Inspect orphan rows (alert_event_id with no matching alert_events.id) before re-running.`,
      )
    }

    // Step 4: composite index for existsSent query shape
    await Schema.table('alert_deliveries', (table) => {
      table.index(['org_id', 'month', 'tier'], 'idx_alert_deliveries_org_month_tier')
    })
  }

  async down(): Promise<void> {
    await Schema.table('alert_deliveries', (table) => {
      table.dropIndex('idx_alert_deliveries_org_month_tier')
      table.dropColumn('org_id')
      table.dropColumn('month')
      table.dropColumn('tier')
    })
  }
}
