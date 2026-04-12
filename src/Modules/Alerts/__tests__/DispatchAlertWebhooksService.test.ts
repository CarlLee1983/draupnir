import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AlertEvent } from '../Domain/Entities/AlertEvent'
import { WebhookEndpoint } from '../Domain/Aggregates/WebhookEndpoint'
import { DispatchAlertWebhooksService } from '../Application/Services/DispatchAlertWebhooksService'
import type { IAlertDeliveryRepository } from '../Domain/Repositories/IAlertDeliveryRepository'
import type { IWebhookEndpointRepository } from '../Domain/Repositories/IWebhookEndpointRepository'

describe('DispatchAlertWebhooksService', () => {
  let endpointRepo: IWebhookEndpointRepository & {
    findActiveByOrg: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }
  let deliveryRepo: IAlertDeliveryRepository & {
    existsSent: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }
  let dispatcher: any
  let logger: any

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
    dispatcher = {
      dispatch: vi.fn(),
    }
    logger = {
      error: vi.fn(),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips deduped endpoints and records sent/failed rows independently', async () => {
    const service = new DispatchAlertWebhooksService({
      endpointRepo,
      deliveryRepo,
      dispatcher: dispatcher as never,
      logger,
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
    // first is already sent
    deliveryRepo.existsSent.mockImplementation(async ({ target }) => target === first.id)

    dispatcher.dispatch
      .mockRejectedValueOnce(new Error('boom')) // second fails
      .mockResolvedValueOnce({ // third succeeds
        success: true,
        statusCode: 200,
        attempts: 1,
        webhookId: 'wh_3',
      })

    await expect(service.dispatchAll(event, 'Org Name')).resolves.toBeUndefined()

    expect(dispatcher.dispatch).toHaveBeenCalledTimes(2) // second and third
    expect(deliveryRepo.save).toHaveBeenCalledTimes(2)
    expect(endpointRepo.save).toHaveBeenCalledTimes(2)
    expect(logger.error).not.toHaveBeenCalled()

    // Verify first was skipped
    expect(dispatcher.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ url: first.url }))
  })

  it('never throws when endpoint lookup fails', async () => {
    const service = new DispatchAlertWebhooksService({
      endpointRepo,
      deliveryRepo,
      dispatcher: dispatcher as never,
      logger,
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

    await expect(service.dispatchAll(event, 'Org Name')).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalled()
  })
})
