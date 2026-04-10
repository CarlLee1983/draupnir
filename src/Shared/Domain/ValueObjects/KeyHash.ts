/**
 * KeyHash Value Object
 * Represents a hashed API key value.
 * Immutable, validated on construction.
 */
export class KeyHash {
  private readonly value: string

  private constructor(hash: string) {
    if (!hash || hash.length === 0) {
      throw new Error('Key hash cannot be empty')
    }
    this.value = hash
  }

  /**
   * Creates a KeyHash from an existing hash string (e.g., from database).
   */
  static fromExisting(hash: string): KeyHash {
    return new KeyHash(hash)
  }

  getValue(): string {
    return this.value
  }

  equals(other: unknown): boolean {
    return other instanceof KeyHash && other.value === this.value
  }

  toString(): string {
    return this.value
  }
}
