import { describe, expect, it } from 'vitest'
import { AlertDelivery } from '../Domain/Entities/AlertDelivery'

describe('AlertDelivery', () => {
  it('creates pending deliveries and preserves immutability on state changes', () => {
    const delivery = AlertDelivery.create({
      alertEventId: 'event-1',
      channel: 'webhook',
      target: 'endpoint-1',
      targetUrl: 'https://example.com/hook',
      dispatchedAt: '2026-04-12T00:00:00.000Z',
      orgId: 'org-1',
      month: '2026-04',
      tier: 'warning',
    })

    expect(delivery.status).toBe('pending')
    expect(delivery.attempts).toBe(0)
    expect(delivery.targetUrl).toBe('https://example.com/hook')

    const sent = delivery.markSent(200, '2026-04-12T00:01:00.000Z', 1)
    const failed = delivery.markFailed(500, 'boom', 3)

    expect(sent).not.toBe(delivery)
    expect(sent.status).toBe('sent')
    expect(sent.deliveredAt).toBe('2026-04-12T00:01:00.000Z')
    expect(failed).not.toBe(delivery)
    expect(failed.status).toBe('failed')
    expect(failed.errorMessage).toBe('boom')
  })
})
