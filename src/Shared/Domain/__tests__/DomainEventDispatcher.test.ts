import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DomainEvent } from '../DomainEvent'
import { DomainEventDispatcher } from '../DomainEventDispatcher'

function makeEvent(eventType: string, data: Record<string, unknown> = {}): DomainEvent {
  return {
    eventType,
    occurredAt: new Date(),
    data,
  } as DomainEvent
}

describe('DomainEventDispatcher — observer API', () => {
  beforeEach(() => {
    DomainEventDispatcher.resetForTesting()
  })

  it('addObserver 註冊後，dispatch 會將 event 傳給 observer', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const observer = vi.fn()
    dispatcher.addObserver(observer)

    const event = makeEvent('credit.topped_up', { orgId: 'org-1' })
    await dispatcher.dispatch(event)

    expect(observer).toHaveBeenCalledTimes(1)
    expect(observer).toHaveBeenCalledWith(event)
  })

  it('observer 錯誤不影響既有 handler 執行', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const handler = vi.fn().mockResolvedValue(undefined)
    const badObserver = vi.fn().mockRejectedValue(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    dispatcher.on('x.y', handler)
    dispatcher.addObserver(badObserver)

    await dispatcher.dispatch(makeEvent('x.y'))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(badObserver).toHaveBeenCalledTimes(1)
    consoleError.mockRestore()
  })

  it('addObserver 回傳的 unsubscribe 函式會移除 observer', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const observer = vi.fn()
    const unsubscribe = dispatcher.addObserver(observer)

    await dispatcher.dispatch(makeEvent('a.b'))
    unsubscribe()
    await dispatcher.dispatch(makeEvent('a.b'))

    expect(observer).toHaveBeenCalledTimes(1)
  })

  it('clearObservers 移除所有 observers 但保留 handlers', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const observer = vi.fn()
    const handler = vi.fn().mockResolvedValue(undefined)

    dispatcher.addObserver(observer)
    dispatcher.on('a.b', handler)
    dispatcher.clearObservers()

    await dispatcher.dispatch(makeEvent('a.b'))

    expect(observer).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
