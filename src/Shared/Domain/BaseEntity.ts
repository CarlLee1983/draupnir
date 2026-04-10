/**
 * Base Entity - DDD Aggregate Root Base Class
 *
 * All domain entities should inherit from this class, which provides:
 * - ID management
 * - Timestamps (created, updated)
 * - Equality comparison
 */
export abstract class BaseEntity {
  protected id: string
  protected createdAt: Date
  protected updatedAt: Date

  constructor(id?: string) {
    this.id = id || crypto.randomUUID()
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  getId(): string {
    return this.id
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date {
    return this.updatedAt
  }

  setUpdatedAt(date: Date): void {
    this.updatedAt = date
  }

  /**
   * Compares two entities for equality (based on ID).
   */
  equals(other: BaseEntity): boolean {
    return this.id === other.id
  }

  /**
   * String representation of the entity.
   */
  toString(): string {
    return `${this.constructor.name}(${this.id})`
  }
}

