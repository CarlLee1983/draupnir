/**
 * HealthStatus Value Object Tests
 */

import { describe, it, expect } from 'bun:test'
import { HealthStatus } from '../../../src/Modules/Health/Domain/ValueObjects/HealthStatus'

describe('HealthStatus Value Object', () => {
  // ✅ Valid states
  it('should create healthy status', () => {
    const status = HealthStatus.healthy()
    expect(status.rawValue).toBe('healthy')
    expect(status.isFullyHealthy()).toBe(true)
    expect(status.isAvailable()).toBe(true)
    expect(status.isDegraded()).toBe(false)
  })

  it('should create degraded status', () => {
    const status = HealthStatus.degraded()
    expect(status.rawValue).toBe('degraded')
    expect(status.isFullyHealthy()).toBe(false)
    expect(status.isAvailable()).toBe(true)
    expect(status.isDegraded()).toBe(true)
  })

  it('should create unhealthy status', () => {
    const status = HealthStatus.unhealthy()
    expect(status.rawValue).toBe('unhealthy')
    expect(status.isFullyHealthy()).toBe(false)
    expect(status.isAvailable()).toBe(false)
    expect(status.isDegraded()).toBe(false)
  })

  // ✅ Invalid states
  it('should reject invalid status', () => {
    expect(() => {
      HealthStatus.from('invalid')
    }).toThrow('Invalid health status')
  })

  // ✅ Value equality
  it('should consider equal statuses as equal', () => {
    const s1 = HealthStatus.healthy()
    const s2 = HealthStatus.healthy()
    expect(s1.equals(s2)).toBe(true)
  })

  it('should consider different statuses as not equal', () => {
    const s1 = HealthStatus.healthy()
    const s2 = HealthStatus.unhealthy()
    expect(s1.equals(s2)).toBe(false)
  })

  // ✅ String conversion
  it('should convert to string', () => {
    const status = HealthStatus.healthy()
    expect(status.toString()).toBe('healthy')
  })

  // ✅ Static factories
  it('should create via static factory healthy()', () => {
    const status = HealthStatus.healthy()
    expect(status.rawValue).toBe('healthy')
  })

  it('should create via static factory degraded()', () => {
    const status = HealthStatus.degraded()
    expect(status.rawValue).toBe('degraded')
  })

  it('should create via static factory unhealthy()', () => {
    const status = HealthStatus.unhealthy()
    expect(status.rawValue).toBe('unhealthy')
  })

  // ✅ from() factory
  it('should create from string via from()', () => {
    const status = HealthStatus.from('healthy')
    expect(status.rawValue).toBe('healthy')
  })
})
