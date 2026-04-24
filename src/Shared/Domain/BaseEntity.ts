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

  /**
   * Initializes a new entity instance.
   *
   * @param id - Optional pre-defined ID. If not provided, a random UUID is generated.
   */
  constructor(id?: string) {
    this.id = id || crypto.randomUUID()
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * Returns the unique identifier of the entity.
   *
   * @returns The entity ID.
   */
  getId(): string {
    return this.id
  }

  /**
   * Returns the timestamp when the entity was created.
   *
   * @returns The creation date.
   */
  getCreatedAt(): Date {
    return this.createdAt
  }

  /**
   * Returns the timestamp when the entity was last updated.
   *
   * @returns The last update date.
   */
  getUpdatedAt(): Date {
    return this.updatedAt
  }

  /**
   * Updates the 'updatedAt' timestamp.
   *
   * @param date - The new update date.
   */
  setUpdatedAt(date: Date): void {
    this.updatedAt = date
  }

  /**
   * Compares two entities for equality (based on ID).
   *
   * @param other - The other entity to compare with.
   * @returns True if IDs are identical, false otherwise.
   */
  equals(other: BaseEntity): boolean {
    return this.id === other.id
  }

  /**
   * String representation of the entity.
   *
   * @returns A string containing the class name and ID.
   */
  toString(): string {
    return `${this.constructor.name}(${this.id})`
  }
}
