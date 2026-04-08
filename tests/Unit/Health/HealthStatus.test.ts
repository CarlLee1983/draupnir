/**
 * HealthStatus Value Object Tests
 */

import { describe, it, expect } from 'bun:test'
import { HealthStatus } from '../../../src/Modules/Health/Domain/ValueObjects/HealthStatus'

describe('HealthStatus Value Object', () => {
  // ✅ Valid states
  it('should create healthy status', () => {
    const status = new HealthStatus('healthy')
    expect(status.value).toBe('healthy')
    expect(status.isFullyHealthy()).toBe(true)
    expect(status.isAvailable()).toBe(true)
    expect(status.isDegraded()).toBe(false)
  })

  it('should create degraded status', () => {
    const status = new HealthStatus('degraded')
    expect(status.value).toBe('degraded')
    expect(status.isFullyHealthy()).toBe(false)
    expect(status.isAvailable()).toBe(true)
    expect(status.isDegraded()).toBe(true)
  })

  it('should create unhealthy status', () => {
    const status = new HealthStatus('unhealthy')
    expect(status.value).toBe('unhealthy')
    expect(status.isFullyHealthy()).toBe(false)
    expect(status.isAvailable()).toBe(false)
    expect(status.isDegraded()).toBe(false)
  })

  // ✅ Invalid states
  it('should reject invalid status', () => {
    expect(() => {
      new HealthStatus('invalid' as any)
    }).toThrow('Invalid health status')
  })

  // ✅ Value equality
  it('should consider equal statuses as equal', () => {
    const s1 = new HealthStatus('healthy')
    const s2 = new HealthStatus('healthy')
    expect(s1.equals(s2)).toBe(true)
  })

  it('should consider different statuses as not equal', () => {
    const s1 = new HealthStatus('healthy')
    const s2 = new HealthStatus('unhealthy')
    expect(s1.equals(s2)).toBe(false)
  })

  // ✅ String conversion
  it('should convert to string', () => {
    const status = new HealthStatus('healthy')
    expect(status.toString()).toBe('healthy')
  })

  // ✅ Static factories
  it('should create via static factory healthy()', () => {
    const status = HealthStatus.healthy()
    expect(status.value).toBe('healthy')
  })

  it('should create via static factory degraded()', () => {
    const status = HealthStatus.degraded()
    expect(status.value).toBe('degraded')
  })

  it('should create via static factory unhealthy()', () => {
    const status = HealthStatus.unhealthy()
    expect(status.value).toBe('unhealthy')
  })
})
