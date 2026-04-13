import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GetAlertHistoryService } from '../Application/Services/GetAlertHistoryService'
import { AlertEvent } from '../Domain/Entities/AlertEvent'
import { AlertDelivery } from '../Domain/Entities/AlertDelivery'
import type { IAlertDeliveryRepository } from '../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertEventRepository } from '../Domain/Repositories/IAlertEventRepository'

describe('GetAlertHistoryService', () => {
  let eventRepo: IAlertEventRepository & {
    listByOrg: ReturnType<typeof vi.fn>
  }
  let deliveryRepo: IAlertDeliveryRepository & {
    findByAlertEventId: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    eventRepo = {
      save: vi.fn(),
      findByOrgAndMonth: vi.fn(),
      findById: vi.fn(),
      listByOrg: vi.fn(),
    } as never
    deliveryRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByAlertEventId: vi.fn(),
      existsSent: vi.fn(),
      listByOrg: vi.fn(),
    } as never
  })

  it('returns events in reverse chronological order with joined deliveries', async () => {
    const service = new GetAlertHistoryService({ eventRepo, deliveryRepo })
    const older = AlertEvent.fromDatabase({
      id: 'event-1',
      org_id: 'org-1',
      tier: 'warning',
      budget_usd: '100.00',
      actual_cost_usd: '85.00',
      percentage: '85.0',
      month: '2026-03',
      recipients: '[]',
      created_at: '2026-03-01T00:00:00.000Z',
    })
    const newer = AlertEvent.fromDatabase({
      id: 'event-2',
      org_id: 'org-1',
      tier: 'critical',
      budget_usd: '100.00',
      actual_cost_usd: '105.00',
      percentage: '105.0',
      month: '2026-04',
      recipients: '[]',
      created_at: '2026-04-01T00:00:00.000Z',
    })
    eventRepo.listByOrg.mockResolvedValue([older, newer])

    const delivery1 = AlertDelivery.create({
      alertEventId: 'event-1',
      channel: 'email',
      target: 'manager@example.com',
      targetUrl: null,
      dispatchedAt: '2026-03-01T00:00:00.000Z',
      orgId: 'org-1',
      month: '2026-03',
      tier: 'warning',
    }).markSent(null, '2026-03-01T00:01:00.000Z', 1)
    const delivery2 = AlertDelivery.create({
      alertEventId: 'event-2',
      channel: 'webhook',
      target: 'endpoint-1',
      targetUrl: 'https://example.com/hook',
      dispatchedAt: '2026-04-01T00:00:00.000Z',
      orgId: 'org-1',
      month: '2026-04',
      tier: 'critical',
    }).markFailed(500, 'boom', 3)

    deliveryRepo.findByAlertEventId.mockImplementation(async (eventId: string) => {
      return eventId === 'event-1' ? [delivery1] : [delivery2]
    })

    const history = await service.list('org-1', { limit: 10, offset: 0 })

    expect(history).toHaveLength(2)
    expect(history[0].event.id).toBe('event-2')
    expect(history[1].event.id).toBe('event-1')
    expect(history[0].deliveries[0].target).toBe('endpoint-1')
    expect(history[1].deliveries[0].target).toBe('manager@example.com')
  })
})
