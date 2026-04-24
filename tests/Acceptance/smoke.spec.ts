import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { ManualQueue } from './support/fakes/ManualQueue'
import { ManualScheduler } from './support/fakes/ManualScheduler'
import { TestApp } from './support/TestApp'
import { TestClock } from './support/TestClock'

class SmokeEvent extends DomainEvent {
  constructor(eventType: string, data: Record<string, unknown>) {
    super('smoke-aggregate', eventType, data, 1, new Date())
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: this.data,
    }
  }
}

describe('Acceptance harness smoke', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('container resolves critical Credit-module services', () => {
    expect(app.container.make('creditController')).toBeDefined()
    expect(app.container.make('topUpCreditService')).toBeDefined()
    expect(app.container.make('deductCreditService')).toBeDefined()
    expect(app.container.make('creditAccountRepository')).toBeDefined()
  })

  it('rebinds clock / llmGatewayClient / scheduler / queue to fakes', () => {
    expect(app.container.make('clock')).toBeInstanceOf(TestClock)
    expect(app.container.make('llmGatewayClient')).toBeInstanceOf(MockGatewayClient)
    expect(app.container.make('scheduler')).toBeInstanceOf(ManualScheduler)
    expect(app.container.make('queue')).toBeInstanceOf(ManualQueue)

    expect(app.container.make('clock')).toBe(app.clock)
    expect(app.container.make('llmGatewayClient')).toBe(app.gateway)
    expect(app.container.make('scheduler')).toBe(app.scheduler)
    expect(app.container.make('queue')).toBe(app.queue)
  })

  it('observer captures dispatched domain events into app.events', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    await dispatcher.dispatch(new SmokeEvent('smoke.test', { note: 'hello' }))

    expect(app.events).toHaveLength(1)
    expect(app.events[0].eventType).toBe('smoke.test')
    expect(app.events[0].data).toEqual({ note: 'hello' })
  })

  it('reset() clears events and gateway call log', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    await dispatcher.dispatch(new SmokeEvent('smoke.test', {}))
    await app.gateway.createKey({ name: 'k', isActive: true })
    expect(app.events.length).toBeGreaterThan(0)
    expect(app.gateway.calls.createKey.length).toBeGreaterThan(0)

    await app.reset()

    expect(app.events).toHaveLength(0)
    expect(app.gateway.calls.createKey).toHaveLength(0)
  })

  it('reset() resets clock to 2026-01-01T00:00:00Z', async () => {
    app.clock.advance(60_000)
    expect(app.clock.nowIso()).not.toBe('2026-01-01T00:00:00.000Z')

    await app.reset()

    expect(app.clock.nowIso()).toBe('2026-01-01T00:00:00.000Z')
  })
})
