// src/Modules/Credit/__tests__/Balance.test.ts
import { describe, expect, it } from 'vitest'
import { Balance } from '../Domain/ValueObjects/Balance'

describe('Balance', () => {
  it('應正確建立餘額', () => {
    const b = Balance.fromString('100.5')
    expect(b.toString()).toBe('100.5')
  })

  it('zero 應為 0', () => {
    expect(Balance.zero().toString()).toBe('0')
  })

  it('add 應正確加總', () => {
    const b = Balance.fromString('100.123456789')
    const result = b.add('50.000000001')
    expect(result.toString()).toBe('150.12345679')
  })

  it('subtract 應正確扣減', () => {
    const b = Balance.fromString('100')
    const result = b.subtract('30.5')
    expect(result.toString()).toBe('69.5')
  })

  it('isLessThanOrEqual 應正確比較', () => {
    expect(Balance.fromString('0').isLessThanOrEqual('0')).toBe(true)
    expect(Balance.fromString('5').isLessThanOrEqual('10')).toBe(true)
    expect(Balance.fromString('10').isLessThanOrEqual('5')).toBe(false)
  })

  it('isNegativeOrZero 應正確判斷', () => {
    expect(Balance.zero().isNegativeOrZero()).toBe(true)
    expect(Balance.fromString('-1').isNegativeOrZero()).toBe(true)
    expect(Balance.fromString('1').isNegativeOrZero()).toBe(false)
  })

  it('負數應允許（扣至零以下仍記錄）', () => {
    const b = Balance.fromString('10')
    const result = b.subtract('15')
    expect(result.isNegativeOrZero()).toBe(true)
    expect(result.toString()).toBe('-5')
  })
})
