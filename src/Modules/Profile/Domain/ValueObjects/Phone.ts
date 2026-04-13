/**
 * Phone Value Object
 * Handles phone number validation and normalization.
 */
export class Phone {
  private readonly value: string

  /**
   * Creates a new Phone instance.
   * @param phone - The raw phone number string.
   * @throws {Error} If the phone format is invalid.
   */
  constructor(phone: string) {
    const cleaned = phone.replace(/[\s\-()]/g, '')
    if (!this.isValid(cleaned)) {
      throw new Error(`Invalid phone number format: ${phone}`)
    }
    this.value = cleaned
  }

  /**
   * Creates a Phone instance if the input is not empty.
   * @param phone - Nullable phone string.
   * @returns Phone instance or null.
   */
  static fromNullable(phone: string | null | undefined): Phone | null {
    if (!phone || phone.trim() === '') return null
    return new Phone(phone)
  }

  /**
   * Validates the phone number format.
   * @param phone - Cleaned phone string.
   * @returns True if valid.
   */
  private isValid(phone: string): boolean {
    const phoneRegex = /^\+?[0-9]{7,15}$/
    return phoneRegex.test(phone)
  }

  /**
   * Gets the normalized phone number.
   */
  getValue(): string {
    return this.value
  }

  /**
   * Compares equality with another Phone instance.
   */
  equals(other: Phone): boolean {
    return this.value === other.value
  }

  /**
   * Returns the string representation of the phone number.
   */
  toString(): string {
    return this.value
  }
}
