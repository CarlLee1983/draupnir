import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import { AlertDelivery } from '../Domain/Entities/AlertDelivery'
import type { AlertPayload } from '../Domain/Services/IAlertNotifier'
import { EmailAlertNotifier } from '../Infrastructure/Services/EmailAlertNotifier'
import { InMemoryAlertDeliveryRepository } from './fakes/InMemoryAlertDeliveryRepository'

describe('EmailAlertNotifier', () => {
  let mailer: IMailer & { send: ReturnType<typeof vi.fn> }
  let deliveryRepo: InMemoryAlertDeliveryRepository

  const payload = (emails: string[]): AlertPayload => ({
    orgId: 'org-1',
    orgName: 'Acme',
    alertEventId: 'evt-1',
    tier: 'warning',
    budgetUsd: '100',
    actualCostUsd: '80',
    percentage: '80.0',
    month: '2026-04',
    keyBreakdown: [],
    emails,
  })

  beforeEach(() => {
    mailer = { send: vi.fn().mockResolvedValue(undefined) } as never
    deliveryRepo = new InMemoryAlertDeliveryRepository()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips recipients already sent and sends only the remaining', async () => {
    const notifier = new EmailAlertNotifier({
      mailer: mailer as never,
      deliveryRepo,
    })

    const sent = AlertDelivery.create({
      alertEventId: 'evt-1',
      channel: 'email',
      target: 'one@example.com',
      targetUrl: null,
      orgId: 'org-1',
      month: '2026-04',
      tier: 'warning',
    }).markSent(null, new Date().toISOString(), 1)
    await deliveryRepo.save(sent)

    await notifier.notify(payload(['one@example.com', 'two@example.com']))

    expect(mailer.send).toHaveBeenCalledTimes(1)
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'two@example.com',
      }),
    )
    const saved = deliveryRepo.all().filter((d) => d.target === 'two@example.com')
    expect(saved).toHaveLength(1)
    expect(saved[0].status).toBe('sent')
  })

  it('records failed delivery when mailer throws', async () => {
    const notifier = new EmailAlertNotifier({
      mailer: mailer as never,
      deliveryRepo,
    })
    mailer.send.mockRejectedValueOnce(new Error('smtp down'))

    const result = await notifier.notify(payload(['a@example.com']))

    expect(result.failures).toBe(1)
    expect(result.successes).toBe(0)
    const rows = deliveryRepo.all()
    expect(rows.some((r) => r.status === 'failed' && r.target === 'a@example.com')).toBe(true)
  })
})
