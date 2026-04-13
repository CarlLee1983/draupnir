import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ResendDeliveryService } from '../Application/Services/ResendDeliveryService'
import { WebhookEndpointGoneError } from '../Application/Errors/WebhookEndpointGoneError'
import { AlertEvent } from '../Domain/Entities/AlertEvent'
import { AlertDelivery } from '../Domain/Entities/AlertDelivery'
import { WebhookEndpoint } from '../Domain/Aggregates/WebhookEndpoint'
import type { IAlertDeliveryRepository } from '../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertEventRepository } from '../Domain/Repositories/IAlertEventRepository'
import type { IWebhookEndpointRepository } from '../Domain/Repositories/IWebhookEndpointRepository'

describe('ResendDeliveryService', () => {
  let deliveryRepo: IAlertDeliveryRepository & {
    findById: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }
  let eventRepo: IAlertEventRepository & {
    findById: ReturnType<typeof vi.fn>
  }
  let endpointRepo: IWebhookEndpointRepository & {
    findById: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> }
  let mailer: { send: ReturnType<typeof vi.fn> }
  let orgRepo: { findById: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    deliveryRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByAlertEventId: vi.fn(),
      existsSent: vi.fn(),
      listByOrg: vi.fn(),
    } as never
    eventRepo = {
      save: vi.fn(),
      findByOrgAndMonth: vi.fn(),
      findById: vi.fn(),
      listByOrg: vi.fn(),
    } as never
    endpointRepo = {
      findById: vi.fn(),
      findByOrg: vi.fn(),
      findActiveByOrg: vi.fn(),
      countByOrg: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    } as never
    dispatcher = { dispatch: vi.fn() }
    mailer = { send: vi.fn() }
    orgRepo = { findById: vi.fn() }
  })

  it('re-sends webhook deliveries and creates a new row', async () => {
    const service = new ResendDeliveryService({
      deliveryRepo,
      eventRepo,
      endpointRepo,
      dispatcher: dispatcher as never,
      mailer: mailer as never,
      orgRepo: orgRepo as never,
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
    const failed = AlertDelivery.create({
      alertEventId: event.id,
      channel: 'webhook',
      target: 'endpoint-1',
      targetUrl: 'https://example.com/hook',
      dispatchedAt: '2026-04-01T00:00:00.000Z',
      orgId: 'org-1',
      month: '2026-04',
      tier: 'critical',
    }).markFailed(500, 'boom', 2)
    const endpoint = WebhookEndpoint.create('org-1', 'https://example.com/hook')

    deliveryRepo.findById.mockResolvedValue(failed)
    eventRepo.findById.mockResolvedValue(event)
    endpointRepo.findById.mockResolvedValue(endpoint)
    orgRepo.findById.mockResolvedValue({ id: 'org-1', name: 'Org Name' })
    dispatcher.dispatch.mockResolvedValue({
      success: true,
      statusCode: 200,
      attempts: 2,
      webhookId: 'wh_1',
    })

    const result = await service.resend('org-1', failed.id)

    expect(result.status).toBe('sent')
    expect(result.id).not.toBe(failed.id)
    expect(deliveryRepo.save).toHaveBeenCalledTimes(1)
    expect(endpointRepo.save).toHaveBeenCalledTimes(1)
  })

  it('rejects non-failed deliveries', async () => {
    const service = new ResendDeliveryService({
      deliveryRepo,
      eventRepo,
      endpointRepo,
      dispatcher: dispatcher as never,
      mailer: mailer as never,
      orgRepo: orgRepo as never,
    })
    const delivery = AlertDelivery.create({
      alertEventId: 'event-1',
      channel: 'webhook',
      target: 'endpoint-1',
      targetUrl: 'https://example.com/hook',
      dispatchedAt: '2026-04-01T00:00:00.000Z',
      orgId: 'org-1',
      month: '2026-04',
      tier: 'warning',
    }).markSent(200, '2026-04-01T00:01:00.000Z', 1)

    deliveryRepo.findById.mockResolvedValue(delivery)

    await expect(service.resend('org-1', delivery.id)).rejects.toThrow('Only failed deliveries can be resent')
  })

  it('raises WebhookEndpointGoneError when the endpoint was deleted', async () => {
    const service = new ResendDeliveryService({
      deliveryRepo,
      eventRepo,
      endpointRepo,
      dispatcher: dispatcher as never,
      mailer: mailer as never,
      orgRepo: orgRepo as never,
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
    const failed = AlertDelivery.create({
      alertEventId: event.id,
      channel: 'webhook',
      target: 'endpoint-missing',
      targetUrl: 'https://example.com/hook',
      dispatchedAt: '2026-04-01T00:00:00.000Z',
      orgId: 'org-1',
      month: '2026-04',
      tier: 'warning',
    }).markFailed(500, 'boom', 1)

    deliveryRepo.findById.mockResolvedValue(failed)
    eventRepo.findById.mockResolvedValue(event)
    endpointRepo.findById.mockResolvedValue(null)

    await expect(service.resend('org-1', failed.id)).rejects.toBeInstanceOf(WebhookEndpointGoneError)
  })
})
