import { getDrizzleInstance } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/config'
import {
  alertDeliveries,
  alertEvents,
} from '@/Shared/Infrastructure/Database/Adapters/Drizzle/schema'

type RecipientDeliveryRow = {
  alert_event_id: string
  channel: 'email'
  target: string
}

function parseRecipients(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((recipient) => String(recipient))
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) {
      return parsed.map((recipient) => String(recipient))
    }
  } catch {
    return []
  }

  return []
}

export async function backfillAlertDeliveries(): Promise<void> {
  const db = getDrizzleInstance()
  const events = await db.select().from(alertEvents)
  const deliveries = await db.select().from(alertDeliveries)
  const existing = new Set<string>()

  for (const delivery of deliveries) {
    existing.add(
      `${String(delivery.alert_event_id)}::${String(delivery.channel)}::${String(delivery.target)}`,
    )
  }

  const rowsToInsert: RecipientDeliveryRow[] = []

  for (const event of events) {
    const recipients = parseRecipients(event.recipients)
    for (const recipient of recipients) {
      const key = `${String(event.id)}::email::${recipient}`
      if (existing.has(key)) {
        continue
      }

      existing.add(key)
      rowsToInsert.push({
        alert_event_id: String(event.id),
        channel: 'email',
        target: recipient,
      })
    }
  }

  for (const row of rowsToInsert) {
    const event = events.find((candidate) => String(candidate.id) === row.alert_event_id)
    const createdAt = String(event?.created_at ?? new Date().toISOString())

    await db.insert(alertDeliveries).values({
      id: crypto.randomUUID(),
      alert_event_id: row.alert_event_id,
      channel: row.channel,
      target: row.target,
      target_url: null,
      status: 'sent',
      attempts: 1,
      status_code: 200,
      error_message: null,
      dispatched_at: createdAt,
      delivered_at: createdAt,
      created_at: createdAt,
    })
  }
}

if (import.meta.main) {
  backfillAlertDeliveries().catch((error) => {
    console.error('[backfillAlertDeliveries] failed', error)
    process.exitCode = 1
  })
}
