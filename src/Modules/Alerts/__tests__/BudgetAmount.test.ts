import { afterEach, describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { BudgetAmount } from '../Domain/ValueObjects/BudgetAmount'
import { MonthlyPeriod } from '../Domain/ValueObjects/MonthlyPeriod'

describe('BudgetAmount', () => {
  it('creates a positive decimal amount and preserves the input string', () => {
    const amount = BudgetAmount.create('100.50')

    expect(amount.value).toBe('100.50')
    expect(amount.decimal.toString()).toBe('100.5')
  })

  it('rejects zero, negative, and non-numeric values', () => {
    expect(() => BudgetAmount.create('0')).toThrow()
    expect(() => BudgetAmount.create('-10')).toThrow()
    expect(() => BudgetAmount.create('abc')).toThrow()
  })

  it('computes percentages using Decimal precision', () => {
    const amount = BudgetAmount.create('100')

    expect(amount.percentageOf(new Decimal('25'))).toBe(25)
    expect(amount.percentageOf(new Decimal('12.5'))).toBe(12.5)
  })
})

describe('MonthlyPeriod', () => {
  const originalDate = Date

  afterEach(() => {
    globalThis.Date = originalDate
  })

  it('returns the current UTC month and accurate month boundaries', () => {
    const fixedNow = new originalDate('2026-04-12T09:30:00Z').valueOf()

    class FakeDate extends originalDate {
      constructor(value?: string | number | Date) {
        if (value === undefined) {
          super(fixedNow)
          return
        }

        super(value)
      }

      static override now(): number {
        return fixedNow
      }
    }

    globalThis.Date = FakeDate as unknown as DateConstructor

    const period = MonthlyPeriod.current()

    expect(period.key).toBe('2026-04')
    expect(period.startDate).toBe('2026-04-01T00:00:00.000Z')
    expect(period.endDate).toBe('2026-04-30T23:59:59.999Z')
  })

  it('parses and compares periods by value', () => {
    const a = MonthlyPeriod.fromString('2026-04')
    const b = MonthlyPeriod.fromString('2026-04')
    const c = MonthlyPeriod.fromString('2026-05')

    expect(a.key).toBe('2026-04')
    expect(a.equals(b)).toBe(true)
    expect(a.equals(c)).toBe(false)
  })
})
