/**
 * Base Value Object - Immutable domain concept.
 *
 * Characteristics of a Value Object:
 * - No ID, defined by its attribute values.
 * - Immutable.
 * - Equality is based on values, not references.
 */
export abstract class ValueObject {
  protected constructor() {}

  /**
   * Compares two value objects for equality.
   * Subclasses should override this method to compare all their attributes.
   *
   * @param other - The other value object to compare with.
   * @returns True if all values are identical, false otherwise.
   */
  abstract equals(other: ValueObject): boolean

  /**
   * Returns a string representation of the value object.
   *
   * @returns A string representation of the internal value.
   */
  abstract toString(): string
}
