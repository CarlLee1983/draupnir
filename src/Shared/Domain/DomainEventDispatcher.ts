// src/Shared/Domain/DomainEventDispatcher.ts
import type { DomainEvent } from './DomainEvent'

type EventHandler = (event: DomainEvent) => Promise<void>

/**
 * 同步領域事件分發器（Singleton）
 *
 * 註冊 handler 後，呼叫 dispatch() 即依序觸發對應的 handler。
 * 設計為 fire-and-forget：handler 失敗會 log 但不中斷流程。
 */
export class DomainEventDispatcher {
  private static instance: DomainEventDispatcher | null = null
  private readonly handlers = new Map<string, EventHandler[]>()

  private constructor() {}

  static getInstance(): DomainEventDispatcher {
    if (!DomainEventDispatcher.instance) {
      DomainEventDispatcher.instance = new DomainEventDispatcher()
    }
    return DomainEventDispatcher.instance
  }

  /** 僅供測試用：重置 singleton */
  static resetForTesting(): void {
    DomainEventDispatcher.instance = null
  }

  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(eventType, [...existing, handler])
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? []
    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error: unknown) {
        console.error(`Event handler 執行失敗 [${event.eventType}]:`, error)
      }
    }
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event)
    }
  }
}
