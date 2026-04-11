// src/Modules/AppModule/__tests__/SubscriptionStatus.test.ts
import { describe, test, expect } from 'bun:test'
import { SubscriptionStatus } from '../Domain/ValueObjects/SubscriptionStatus'

describe('SubscriptionStatus', () => {
  test('建立各狀態', () => {
    expect(SubscriptionStatus.active().toString()).toBe('active')
    expect(SubscriptionStatus.suspended().toString()).toBe('suspended')
    expect(SubscriptionStatus.cancelled().toString()).toBe('cancelled')
  })

  test('fromString', () => {
    expect(SubscriptionStatus.fromString('active').isActive()).toBe(true)
    expect(SubscriptionStatus.fromString('suspended').isSuspended()).toBe(true)
  })

  test('無效字串拋出錯誤', () => {
    expect(() => SubscriptionStatus.fromString('invalid')).toThrow('Invalid subscription status')
  })

  test('active → suspended 合法', () => {
    const result = SubscriptionStatus.active().transitionTo(SubscriptionStatus.suspended())
    expect(result.isSuspended()).toBe(true)
  })

  test('active → cancelled 合法', () => {
    const result = SubscriptionStatus.active().transitionTo(SubscriptionStatus.cancelled())
    expect(result.isCancelled()).toBe(true)
  })

  test('suspended → active 合法', () => {
    const result = SubscriptionStatus.suspended().transitionTo(SubscriptionStatus.active())
    expect(result.isActive()).toBe(true)
  })

  test('cancelled 不可轉換', () => {
    const cancelled = SubscriptionStatus.cancelled()
    expect(cancelled.canTransitionTo(SubscriptionStatus.active())).toBe(false)
    expect(() => cancelled.transitionTo(SubscriptionStatus.active())).toThrow()
  })

  test('equals', () => {
    expect(SubscriptionStatus.active().equals(SubscriptionStatus.active())).toBe(true)
    expect(SubscriptionStatus.active().equals(SubscriptionStatus.suspended())).toBe(false)
  })
})
