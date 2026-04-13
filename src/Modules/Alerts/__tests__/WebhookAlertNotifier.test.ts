import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebhookEndpoint } from '../Domain/Aggregates/WebhookEndpoint'
import { AlertEvent } from '../Domain/Entities/AlertEvent'
import type { IAlertDeliveryRepository } from '../Domain/Repositories/IAlertDeliveryRepository'
import type { IWebhookEndpointRepository } from '../Domain/Repositories/IWebhookEndpointRepository'
import type { AlertPayload } from '../Domain/Services/IAlertNotifier'
import { WebhookAlertNotifier } from '../Infrastructure/Services/WebhookAlertNotifier'

describe('WebhookAlertNotifier', () => {
  let endpointRepo: IWebhookEndpointRepository & {
    findActiveByOrg: ReturnType<typeof vi.fn>
    findById: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }
  let deliveryRepo: IAlertDeliveryRepository & {
    existsSent: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> }
  let logger: { error: ReturnType<typeof vi.fn> }

  const basePayload = (event: AlertEvent, orgName: string): AlertPayload => ({
    orgId: event.orgId,
    orgName,
    alertEventId: event.id,
    tier: event.tier,
    budgetUsd: event.budgetUsd,
    actualCostUsd: event.actualCostUsd,
    percentage: event.percentage,
    month: event.month,
    keyBreakdown: [],
    emails: [],
  })

  beforeEach(() => {
    endpointRepo = {
      findById: vi.fn(),
      findByOrg: vi.fn(),
      findActiveByOrg: vi.fn(),
      countByOrg: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    } as never
    deliveryRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByAlertEventId: vi.fn(),
      existsSent: vi.fn(),
      listByOrg: vi.fn(),
    } as never
    dispatcher = { dispatch: vi.fn() }
    logger = { error: vi.fn() }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips deduped endpoints and records sent/failed rows independently', async () => {
    const notifier = new WebhookAlertNotifier({
      endpointRepo: endpointRepo as never,
      deliveryRepo: deliveryRepo as never,
      dispatcher: dispatcher as never,
      logger: logger as { error: (...args: unknown[]) => void },
    })
    const event = AlertEvent.create({
      orgId: 'org-1',
      tier: 'critical',
      budgetUsd: '100.00',
      actualCostUsd: '105.00',
      percentage: '105.0',
      month: '2026-04',
      recipients: [],
    })
    const first = WebhookEndpoint.create('org-1', 'https://example.com/one')
    const second = WebhookEndpoint.create('org-1', 'https://example.com/two')
    const third = WebhookEndpoint.create('org-1', 'https://example.com/three')

    endpointRepo.findActiveByOrg.mockResolvedValue([first, second, third])
    deliveryRepo.existsSent.mockImplementation(async ({ target }) => target === first.id)

    dispatcher.dispatch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      attempts: 1,
      webhookId: 'wh_3',
    })

    await expect(notifier.notify(basePayload(event, 'Org Name'))).resolves.toMatchObject({
      channel: 'webhook',
    })

    expect(dispatcher.dispatch).toHaveBeenCalledTimes(2)
    expect(deliveryRepo.save).toHaveBeenCalledTimes(2)
    expect(endpointRepo.save).toHaveBeenCalledTimes(2)
    expect(logger.error).not.toHaveBeenCalled()

    expect(dispatcher.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: first.url }),
    )
  })

  it('never throws when endpoint lookup fails', async () => {
    const notifier = new WebhookAlertNotifier({
      endpointRepo: endpointRepo as never,
      deliveryRepo: deliveryRepo as never,
      dispatcher: dispatcher as never,
      logger: logger as { error: (...args: unknown[]) => void },
    })
    const event = AlertEvent.create({
      orgId: 'org-1',
      tier: 'warning',
      budgetUsd: '100.00',
      actualCostUsd: '85.00',
      percentage: '85.0',
      month: '2026-04',
      recipients: [],
    })

    endpointRepo.findActiveByOrg.mockRejectedValueOnce(new Error('database down'))

    await expect(notifier.notify(basePayload(event, 'Org Name'))).resolves.toEqual({
      channel: 'webhook',
      successes: 0,
      failures: 0,
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
