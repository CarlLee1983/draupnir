import { describe, expect, it } from 'vitest'
import { SendAlertService } from '../Application/Services/SendAlertService'
import type { DeliveryResult, IAlertNotifier } from '../Domain/Services/IAlertNotifier'
import { InMemoryAlertEventRepository } from './fakes/InMemoryAlertEventRepository'
import { InMemoryAlertRecipientResolver } from './fakes/InMemoryAlertRecipientResolver'
import { FakeAlertNotifier } from './fakes/FakeAlertNotifier'

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
  it('invokes email and webhook notifiers with the same payload after persisting the event', async () => {
    const recipientResolver = new InMemoryAlertRecipientResolver({
      'org-1': { orgId: 'org-1', orgName: 'Org Name', emails: ['one@example.com', 'two@example.com'] },
    })
    const alertEventRepo = new InMemoryAlertEventRepository()
    const emailNotifier = new FakeAlertNotifier('email')
    const webhookNotifier = new FakeAlertNotifier('webhook')

    const service = new SendAlertService({
      recipientResolver,
      alertEventRepo,
      notifiers: [emailNotifier, webhookNotifier],
    })

    await service.send({
      orgId: 'org-1',
      tier: 'warning',
      budgetUsd: '100.00',
      actualCostUsd: '85.00',
      percentage: '85.0',
      month: '2026-04',
      keyBreakdown: [],
    })

    expect(alertEventRepo.all()).toHaveLength(1)
    expect(emailNotifier.calls).toHaveLength(1)
    expect(webhookNotifier.calls).toHaveLength(1)
    const payload = emailNotifier.calls[0]
    expect(payload.emails).toEqual(['one@example.com', 'two@example.com'])
    expect(webhookNotifier.calls[0]).toEqual(payload)
  })

  it('returns before webhook notifier completes', async () => {
    const recipientResolver = new InMemoryAlertRecipientResolver({
      'org-1': { orgId: 'org-1', orgName: 'Org Name', emails: [] },
    })
    const alertEventRepo = new InMemoryAlertEventRepository()
    const { promise: neverResolves } = createDeferred<DeliveryResult>()

    const webhookPending: IAlertNotifier = {
      channel: 'webhook',
      notify: () => neverResolves,
    }

    const service = new SendAlertService({
      recipientResolver,
      alertEventRepo,
      notifiers: [new FakeAlertNotifier('email'), webhookPending],
    })

    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 25))
    const result = await Promise.race([
      service
        .send({
          orgId: 'org-1',
          tier: 'critical',
          budgetUsd: '100.00',
          actualCostUsd: '105.00',
          percentage: '105.0',
          month: '2026-04',
          keyBreakdown: [],
        })
        .then(() => 'resolved' as const),
      timeout,
    ])

    expect(result).toBe('resolved')
  })
})
