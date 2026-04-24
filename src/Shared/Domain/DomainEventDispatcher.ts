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

  /**
   * Returns the singleton instance of the dispatcher.
   *
   * @returns The DomainEventDispatcher instance.
   */
  static getInstance(): DomainEventDispatcher {
    if (!DomainEventDispatcher.instance) {
      DomainEventDispatcher.instance = new DomainEventDispatcher()
    }
    return DomainEventDispatcher.instance
  }

  /**
   * Resets the singleton instance.
   *
   * @internal Only for testing purposes.
   */
  static resetForTesting(): void {
    DomainEventDispatcher.instance = null
  }

  /**
   * Registers a handler for a specific domain event type.
   *
   * @param eventType - The type of event to listen for.
   * @param handler - The async function to execute when the event occurs.
   */
  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(eventType, [...existing, handler])
  }

  /**
   * Dispatches a domain event to all registered handlers.
   *
   * Handlers are executed in sequence. Failures are logged but do not block other handlers.
   *
   * @param event - The domain event to dispatch.
   * @returns A promise that resolves when all handlers have completed.
   */
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

  /**
   * Dispatches multiple domain events.
   *
   * @param events - The array of domain events to dispatch.
   * @returns A promise that resolves when all events have been dispatched.
   */
  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event)
    }
  }
}
