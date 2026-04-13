import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { SendAlertService } from '../Application/Services/SendAlertService'
import type { IAlertDeliveryRepository } from '../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertEventRepository } from '../Domain/Repositories/IAlertEventRepository'

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('SendAlertService', () => {
  let mailer: { send: ReturnType<typeof vi.fn> }

  let alertEventRepo: IAlertEventRepository & {
    save: ReturnType<typeof vi.fn>
  }
  let deliveryRepo: IAlertDeliveryRepository & {
    existsSent: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }
  let webhookDispatch: { dispatchAll: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mailer = { send: vi.fn() }
    alertEventRepo = {
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
    webhookDispatch = { dispatchAll: vi.fn() }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes per-recipient email deliveries and skips deduped recipients', async () => {
    const recipientResolver = { resolveByOrg: vi.fn() }
    recipientResolver.resolveByOrg.mockResolvedValue({
      orgId: 'org-1',
      orgName: 'Org Name',
      emails: ['one@example.com', 'two@example.com'],
    })

    const service = new SendAlertService({
      recipientResolver: recipientResolver as never,
      alertEventRepo: alertEventRepo as never,
      deliveryRepo: deliveryRepo as never,
      mailer: mailer as never,
      dispatchWebhooksService: webhookDispatch as never,
    })

    deliveryRepo.existsSent.mockImplementation(async ({ target }) => target === 'one@example.com')
    mailer.send.mockResolvedValue(undefined)

    await service.send({
      orgId: 'org-1',
      tier: 'warning',
      budgetUsd: '100.00',
      actualCostUsd: '85.00',
      percentage: '85.0',
      month: '2026-04',
      keyBreakdown: [],
    })

    expect(alertEventRepo.save).toHaveBeenCalledTimes(1)
    const savedEvent = alertEventRepo.save.mock.calls[0][0] as { recipients: readonly string[] }
    expect(savedEvent.recipients).toEqual([])
    expect(mailer.send).toHaveBeenCalledTimes(1)
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'two@example.com',
      }),
    )
    expect(deliveryRepo.save).toHaveBeenCalledTimes(1)
    expect(webhookDispatch.dispatchAll).toHaveBeenCalledTimes(1)
  })

  it('returns before webhook dispatch completes', async () => {
    const recipientResolver = { resolveByOrg: vi.fn() }
    recipientResolver.resolveByOrg.mockResolvedValue({
      orgId: 'org-1',
      orgName: 'Org Name',
      emails: [],
    })
    alertEventRepo.save.mockResolvedValue(undefined)
    webhookDispatch.dispatchAll.mockReturnValue(createDeferred().promise)

    const service = new SendAlertService({
      recipientResolver: recipientResolver as never,
      alertEventRepo: alertEventRepo as never,
      deliveryRepo: deliveryRepo as never,
      mailer: mailer as never,
      dispatchWebhooksService: webhookDispatch as never,
    })

    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 25))
    const result = await Promise.race([
      service.send({
        orgId: 'org-1',
        tier: 'critical',
        budgetUsd: '100.00',
        actualCostUsd: '105.00',
        percentage: '105.0',
        month: '2026-04',
        keyBreakdown: [],
      }).then(() => 'resolved' as const),
      timeout,
    ])

    expect(result).toBe('resolved')
    expect(webhookDispatch.dispatchAll).toHaveBeenCalledTimes(1)
  })
})
