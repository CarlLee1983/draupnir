/**
 * Email value object.
 *
 * Responsibilities:
 * - Validate email format and length.
 * - Normalize email to lowercase.
 * - Preserve immutability.
 */
export class Email {
  /** The normalized email string. */
  private readonly value: string

  /**
   * Creates an Email value object.
   * @throws Error if the format is invalid or too long.
   */
  constructor(email: string) {
    if (!this.isValid(email)) {
      throw new Error(`Invalid email format: ${email}`)
    }
    this.value = email.toLowerCase()
  }

  /**
   * Validates the format and length of an email address.
   */
  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
  }

  /**
   * Gets the normalized email string.
   */
  getValue(): string {
    return this.value
  }

  /**
   * Checks for value equality against another Email instance.
   */
  equals(other: Email): boolean {
    return this.value === other.value
  }

  /**
   * Returns the string representation of the email address.
   */
  toString(): string {
    return this.value
  }
}
