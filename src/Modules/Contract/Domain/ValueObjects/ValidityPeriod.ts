// src/Modules/Contract/Domain/ValueObjects/ValidityPeriod.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export class ValidityPeriod extends ValueObject {
  private constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
  ) {
    super()
  }

  static create(startDate: Date, endDate: Date): ValidityPeriod {
    if (endDate <= startDate) {
      throw new Error('End date must be after start date')
    }
    return new ValidityPeriod(startDate, endDate)
  }

  static fromStrings(start: string, end: string): ValidityPeriod {
    return ValidityPeriod.create(new Date(start), new Date(end))
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this.endDate
  }

  isExpiringSoon(days: number, now: Date = new Date()): boolean {
    const threshold = new Date(this.endDate)
    threshold.setDate(threshold.getDate() - days)
    return now >= threshold && now < this.endDate
  }

  isActive(now: Date = new Date()): boolean {
    return now >= this.startDate && now < this.endDate
  }

  getStartDate(): Date {
    return this.startDate
  }

  getEndDate(): Date {
    return this.endDate
  }

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
