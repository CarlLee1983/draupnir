/**
 * Password Value Object
 * Handles hashed secret management.
 *
 * Responsibilities:
 * - Hold the stored hash string.
 * - Ensure the hash is not empty.
 * - No hashing or verification logic (application/infrastructure concern).
 */
export class Password {
  /** The internal representation of the hashed password. */
  private readonly hashedPassword: string

  /**
   * Internal constructor for the Password value object.
   * @throws {Error} If the hash is null or empty.
   */
  private constructor(hashedPassword: string) {
    if (!hashedPassword || hashedPassword.trim() === '') {
      throw new Error('Invalid password hash')
    }

    this.hashedPassword = hashedPassword
  }

  /** Static factory method to create a Password instance from an existing hash. */
  static fromHashed(hashedPassword: string): Password {
    return new Password(hashedPassword)
  }

  /** Gets the raw hashed password string. */
  getHashed(): string {
    return this.hashedPassword
  }

  /** Returns the string representation of the hashed password. */
  toString(): string {
    return this.hashedPassword
  }
}

