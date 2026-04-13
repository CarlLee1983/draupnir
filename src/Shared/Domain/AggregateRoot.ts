import { BaseEntity } from './BaseEntity'
import type { DomainEvent } from './DomainEvent'

/**
 * Aggregate Root Base Class - Support for Event Sourcing
 *
 * Inherits from BaseEntity, providing:
 * - Event generation (raiseEvent)
 * - Event rehydration (loadFromEvents)
 * - Uncommitted event management (getUncommittedEvents, markEventsAsCommitted)
 * - Aggregate versioning (getVersion)
 *
 * Subclasses must implement the applyEvent() method to define how events
 * affect the aggregate state.
 */
export abstract class AggregateRoot extends BaseEntity {
  /** Total count of applied events (Aggregate Version) */
  private appliedEventCount = 0

  /** Uncommitted domain events */
  private uncommittedEvents: DomainEvent[] = []

  /**
   * Generates a domain event: first applies the state change,
   * then adds it to the uncommitted list.
   */
  protected raiseEvent(event: DomainEvent): void {
    this.applyEvent(event)
    this.uncommittedEvents.push(event)
    this.appliedEventCount++
  }

  /**
   * Subclass implementation: defines how a single event affects the aggregate state.
   */
  abstract applyEvent(event: DomainEvent): void

  /**
   * Reconstructs the aggregate state from an event stream (rehydration).
   * Only calls applyEvent, does not add to uncommitted events.
   */
  loadFromEvents(events: readonly DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event)
      this.appliedEventCount++
    }
  }

  /**
   * Returns uncommitted domain events (returns a read-only copy).
   */
  getUncommittedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.uncommittedEvents]
  }

  /**
   * Marks all events as committed and clears the uncommitted list.
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = []
  }

  /**
   * Returns the aggregate version (total count of applied events).
   */
  getVersion(): number {
    return this.appliedEventCount
  }
}
