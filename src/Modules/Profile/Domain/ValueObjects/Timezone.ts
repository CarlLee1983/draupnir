/**
 * Validates if a string is a valid IANA timezone identifier.
 * @param tz - Timezone string to validate.
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Timezone Value Object
 * Ensures the timezone is a valid IANA identifier.
 */
export class Timezone {
  private readonly value: string

  /**
   * Creates a new Timezone instance.
   * @param timezone - IANA timezone identifier.
   * @throws {Error} If the timezone is invalid.
   */
  constructor(timezone: string) {
    if (!isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`)
    }
    this.value = timezone
  }

  /**
   * Returns the default timezone (Asia/Taipei).
   */
  static default(): Timezone {
    return new Timezone('Asia/Taipei')
  }

  /**
   * Gets the timezone value.
   */
  getValue(): string {
    return this.value
  }

  /**
   * Compares equality with another Timezone instance.
   */
  equals(other: Timezone): boolean {
    return this.value === other.value
  }

  /**
   * Returns the string representation of the timezone.
   */
  toString(): string {
    return this.value
  }
}
