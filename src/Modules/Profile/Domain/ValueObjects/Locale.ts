/**
 * Supported locales for the application.
 */
const SUPPORTED_LOCALES = ['zh-TW', 'en', 'ja', 'ko'] as const

/**
 * Type representing one of the supported locales.
 */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Locale Value Object
 * Handles language and region preferences.
 */
export class Locale {
  private readonly value: SupportedLocale

  /**
   * Creates a new Locale instance.
   * @param locale - The locale string to validate.
   * @throws {Error} If the locale is not supported.
   */
  constructor(locale: string) {
    if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
      throw new Error(`Unsupported locale: ${locale}. Supported: ${SUPPORTED_LOCALES.join(', ')}`)
    }
    this.value = locale as SupportedLocale
  }

  /**
   * Returns the default locale (zh-TW).
   */
  static default(): Locale {
    return new Locale('zh-TW')
  }

  /**
   * Gets the locale value.
   */
  getValue(): SupportedLocale {
    return this.value
  }

  /**
   * Compares equality with another Locale instance.
   */
  equals(other: Locale): boolean {
    return this.value === other.value
  }

  /**
   * Returns the string representation of the locale.
   */
  toString(): string {
    return this.value
  }
}

