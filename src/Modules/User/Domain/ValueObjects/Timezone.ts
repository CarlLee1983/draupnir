const VALID_TIMEZONES = Intl.supportedValuesOf('timeZone')

export class Timezone {
  private readonly value: string

  constructor(timezone: string) {
    if (!VALID_TIMEZONES.includes(timezone)) {
      throw new Error(`無效的時區: ${timezone}`)
    }
    this.value = timezone
  }

  static default(): Timezone {
    return new Timezone('Asia/Taipei')
  }

  getValue(): string {
    return this.value
  }

  equals(other: Timezone): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
