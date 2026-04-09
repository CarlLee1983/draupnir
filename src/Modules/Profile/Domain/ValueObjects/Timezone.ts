function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export class Timezone {
  private readonly value: string

  constructor(timezone: string) {
    if (!isValidTimezone(timezone)) {
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
