const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/

/**
 * Calendar-month period value object.
 */
export class MonthlyPeriod {
  private readonly yearValue: number
  private readonly monthValue: number

  constructor(year: number, month: number) {
    if (!Number.isInteger(year) || year < 0) {
      throw new Error('MonthlyPeriod year must be a non-negative integer')
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('MonthlyPeriod month must be between 1 and 12')
    }

    this.yearValue = year
    this.monthValue = month
  }

  static current(): MonthlyPeriod {
    const now = new Date()
    return new MonthlyPeriod(now.getUTCFullYear(), now.getUTCMonth() + 1)
  }

  static fromString(value: string): MonthlyPeriod {
    const match = MONTH_KEY_PATTERN.exec(value.trim())
    if (!match) {
      throw new Error('MonthlyPeriod must be formatted as YYYY-MM')
    }

    return new MonthlyPeriod(Number(match[1]), Number(match[2]))
  }

  get key(): string {
    return `${this.yearValue}-${String(this.monthValue).padStart(2, '0')}`
  }

  get startDate(): string {
    return new Date(Date.UTC(this.yearValue, this.monthValue - 1, 1, 0, 0, 0, 0)).toISOString()
  }

  get endDate(): string {
    return new Date(Date.UTC(this.yearValue, this.monthValue, 0, 23, 59, 59, 999)).toISOString()
  }

  equals(other: MonthlyPeriod): boolean {
    return this.yearValue === other.yearValue && this.monthValue === other.monthValue
  }
}
