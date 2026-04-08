const SUPPORTED_LOCALES = ['zh-TW', 'en', 'ja', 'ko'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export class Locale {
  private readonly value: SupportedLocale

  constructor(locale: string) {
    if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
      throw new Error(`不支援的語系: ${locale}，支援: ${SUPPORTED_LOCALES.join(', ')}`)
    }
    this.value = locale as SupportedLocale
  }

  static default(): Locale {
    return new Locale('zh-TW')
  }

  getValue(): SupportedLocale {
    return this.value
  }

  equals(other: Locale): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
