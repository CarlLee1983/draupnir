// src/Modules/Contract/__tests__/ContractStatus.test.ts
import { describe, test, expect } from 'bun:test'
import { ContractStatus } from '../Domain/ValueObjects/ContractStatus'

describe('ContractStatus', () => {
  test('建立各狀態', () => {
    expect(ContractStatus.draft().toString()).toBe('draft')
    expect(ContractStatus.active().toString()).toBe('active')
    expect(ContractStatus.expired().toString()).toBe('expired')
    expect(ContractStatus.terminated().toString()).toBe('terminated')
  })

  test('從字串建立', () => {
    expect(ContractStatus.fromString('draft').isDraft()).toBe(true)
    expect(ContractStatus.fromString('active').isActive()).toBe(true)
  })

  test('無效字串拋出錯誤', () => {
    expect(() => ContractStatus.fromString('invalid')).toThrow('Invalid contract status')
  })

  test('DRAFT → ACTIVE 合法', () => {
    const draft = ContractStatus.draft()
    const result = draft.transitionTo(ContractStatus.active())
    expect(result.isActive()).toBe(true)
  })

  test('ACTIVE → EXPIRED 合法', () => {
    const active = ContractStatus.active()
    const result = active.transitionTo(ContractStatus.expired())
    expect(result.isExpired()).toBe(true)
  })

  test('ACTIVE → TERMINATED 合法', () => {
    const active = ContractStatus.active()
    const result = active.transitionTo(ContractStatus.terminated())
    expect(result.isTerminated()).toBe(true)
  })

  test('DRAFT → EXPIRED 非法', () => {
    const draft = ContractStatus.draft()
    expect(() => draft.transitionTo(ContractStatus.expired())).toThrow(
      'Cannot transition from draft to expired',
    )
  })

  test('EXPIRED → ACTIVE 非法', () => {
    const expired = ContractStatus.expired()
    expect(() => expired.transitionTo(ContractStatus.active())).toThrow()
  })

  test('TERMINATED 不可轉換', () => {
    const terminated = ContractStatus.terminated()
    expect(terminated.canTransitionTo(ContractStatus.active())).toBe(false)
    expect(terminated.canTransitionTo(ContractStatus.draft())).toBe(false)
  })

  test('equals 比較', () => {
    expect(ContractStatus.draft().equals(ContractStatus.draft())).toBe(true)
    expect(ContractStatus.draft().equals(ContractStatus.active())).toBe(false)
  })
})
