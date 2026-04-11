// src/Modules/Contract/__tests__/ValidityPeriod.test.ts
import { describe, test, expect } from 'bun:test'
import { ValidityPeriod } from '../Domain/ValueObjects/ValidityPeriod'

describe('ValidityPeriod', () => {
  const now = new Date('2026-06-15T00:00:00Z')

  test('建立有效期間', () => {
    const period = ValidityPeriod.create(new Date('2026-01-01'), new Date('2026-12-31'))
    expect(period.getStartDate()).toEqual(new Date('2026-01-01'))
    expect(period.getEndDate()).toEqual(new Date('2026-12-31'))
  })

  test('結束日期早於開始日期拋出錯誤', () => {
    expect(() => ValidityPeriod.create(new Date('2026-12-31'), new Date('2026-01-01'))).toThrow(
      'End date must be after start date',
    )
  })

  test('isActive 在期間內回傳 true', () => {
    const period = ValidityPeriod.create(new Date('2026-01-01'), new Date('2026-12-31'))
    expect(period.isActive(now)).toBe(true)
  })

  test('isExpired 在結束日期後回傳 true', () => {
    const period = ValidityPeriod.create(new Date('2025-01-01'), new Date('2025-12-31'))
    expect(period.isExpired(now)).toBe(true)
  })

  test('isExpiringSoon 在到期前 N 天回傳 true', () => {
    const period = ValidityPeriod.create(new Date('2026-01-01'), new Date('2026-06-20T00:00:00Z'))
    expect(period.isExpiringSoon(7, now)).toBe(true)
    expect(period.isExpiringSoon(3, now)).toBe(false)
  })

  test('getDaysRemaining 計算剩餘天數', () => {
    const period = ValidityPeriod.create(new Date('2026-01-01'), new Date('2026-06-20T00:00:00Z'))
    expect(period.getDaysRemaining(now)).toBe(5)
  })

  test('fromStrings 建立', () => {
    const period = ValidityPeriod.fromStrings('2026-01-01', '2026-12-31')
    expect(period.isActive(now)).toBe(true)
  })

  test('equals 比較', () => {
    const a = ValidityPeriod.create(new Date('2026-01-01'), new Date('2026-12-31'))
    const b = ValidityPeriod.create(new Date('2026-01-01'), new Date('2026-12-31'))
    const c = ValidityPeriod.create(new Date('2026-01-01'), new Date('2026-06-30'))
    expect(a.equals(b)).toBe(true)
    expect(a.equals(c)).toBe(false)
  })

  test('toJSON 序列化', () => {
    const period = ValidityPeriod.create(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-12-31T00:00:00.000Z'),
    )
    const json = period.toJSON()
    expect(json.startDate).toBe('2026-01-01T00:00:00.000Z')
    expect(json.endDate).toBe('2026-12-31T00:00:00.000Z')
  })
})
