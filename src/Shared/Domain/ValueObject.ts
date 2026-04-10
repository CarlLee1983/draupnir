/**
 * Base Value Object - Immutable domain concept.
 *
 * Characteristics of a Value Object:
 * - No ID, defined by its attribute values.
 * - Immutable.
 * - Equality is based on values, not references.
 */
export abstract class ValueObject {
  /**
   * Compares two value objects for equality.
   * Subclasses should override this method to compare all their attributes.
   */
  abstract equals(other: ValueObject): boolean

  /**
   * String representation of the value object.
   */
  abstract toString(): string
}
