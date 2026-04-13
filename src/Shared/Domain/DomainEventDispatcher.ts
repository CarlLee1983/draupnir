// src/Shared/Domain/DomainEventDispatcher.ts
import type { DomainEvent } from './DomainEvent'

type EventHandler = (event: DomainEvent) => Promise<void>

/**
 * Synchronous Domain Event Dispatcher (Singleton).
 *
 * After registering handlers, call dispatch() to trigger the corresponding
 * handlers in sequence. Designed as fire-and-forget: handler failures are
 * logged but do not interrupt the flow.
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

  /** Only for testing: reset the singleton instance. */
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
        console.error(`Event handler failed [${event.eventType}]:`, error)
      }
    }
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event)
    }
  }
}
