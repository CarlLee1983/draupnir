/**
 * Abstract Base Class for Domain Events
 *
 * Provides core properties for all domain events:
 * - eventId: Unique identifier (UUID)
 * - aggregateId: Identifier of the aggregate root
 * - eventType: Categorization of the event
 * - occurredAt: Timestamp of when the event happened
 * - version: Schema version for event migration
 * - data: Payload containing event details
 *
 * Subclasses must implement the toJSON() method to support serialization.
 *
 * Version Management:
 * - version: Numeric version for backward compatibility
 * - getSchemaVersion(): Returns semantic version (MAJOR.MINOR.PATCH)
 */
export abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID()
  readonly aggregateId: string
  readonly aggregateType?: string
  readonly eventType: string
  readonly occurredAt: Date
  readonly version: number
  readonly data: Record<string, unknown>

  constructor(
    aggregateId: string,
    eventType: string,
    data: Record<string, unknown> = {},
    version: number = 1,
    occurredAt?: Date,
  ) {
    this.aggregateId = aggregateId
    this.eventType = eventType
    this.occurredAt = occurredAt ?? new Date()
    this.version = version
    this.data = data
  }

  /**
   * Retrieves the semantic version of the event schema (MAJOR.MINOR.PATCH).
   *
   * Used to determine migration strategies:
   * - Same MAJOR version: Backward compatible, migration applies
   * - Different MAJOR versions: Breaking change, requires special handling
   *
   * Default implementation: Direct mapping of version number to semantic version.
   * Subclasses can override this for custom mapping.
   */
  getSchemaVersion(): string {
    const versions: Record<number, string> = {
      1: '1.0.0', // Initial version
      2: '1.1.0', // Non-breaking additive change
      3: '1.2.0',
      // Additional version mappings...
    }
    return versions[this.version] ?? `1.${this.version - 1}.0`
  }

  /**
   * Serializes the event to a JSON object.
   */
  abstract toJSON(): Record<string, unknown>
}
