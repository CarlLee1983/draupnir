// src/Modules/Contract/Domain/ValueObjects/ValidityPeriod.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

/** Half-open style validity window between start and end instants. */
export class ValidityPeriod extends ValueObject {
  private constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
  ) {
    super()
  }

  /** Builds a period; requires `endDate` strictly after `startDate`. */
  static create(startDate: Date, endDate: Date): ValidityPeriod {
    if (endDate <= startDate) {
      throw new Error('End date must be after start date')
    }
    return new ValidityPeriod(startDate, endDate)
  }

  /** Parses ISO-like date strings into a validated period. */
  static fromStrings(start: string, end: string): ValidityPeriod {
    return ValidityPeriod.create(new Date(start), new Date(end))
  }

  /** True when `now` is on or after the end instant. */
  isExpired(now: Date = new Date()): boolean {
    return now >= this.endDate
  }

  /** True when within the last `days` before end and not yet expired at `now`. */
  isExpiringSoon(days: number, now: Date = new Date()): boolean {
    const threshold = new Date(this.endDate)
    threshold.setDate(threshold.getDate() - days)
    return now >= threshold && now < this.endDate
  }

  /** True when `now` is on or after start and strictly before end. */
  isActive(now: Date = new Date()): boolean {
    return now >= this.startDate && now < this.endDate
  }

  getStartDate(): Date {
    return this.startDate
  }

  getEndDate(): Date {
    return this.endDate
  }

  /** Whole days from `now` until end, floored at zero. */
  getDaysRemaining(now: Date = new Date()): number {
    const diff = this.endDate.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ValidityPeriod)) return false
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    )
  }

  toString(): string {
    return `${this.startDate.toISOString()} ~ ${this.endDate.toISOString()}`
  }

  toJSON(): { startDate: string; endDate: string } {
    return {
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
    }
  }
}
