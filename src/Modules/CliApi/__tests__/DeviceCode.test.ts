// src/Modules/CliApi/__tests__/DeviceCode.test.ts
import { describe, it, expect } from 'vitest'
import { DeviceCode, DeviceCodeStatus } from '../Domain/ValueObjects/DeviceCode'

describe('DeviceCode', () => {
  it('should create a pending device code with valid codes', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    expect(dc.deviceCode).toBe('dc-uuid-123')
    expect(dc.userCode).toBe('ABCD1234')
    expect(dc.status).toBe(DeviceCodeStatus.PENDING)
    expect(dc.userId).toBeNull()
    expect(dc.isExpired()).toBe(false)
  })

  it('should detect expired device code', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(dc.isExpired()).toBe(true)
  })

  it('should authorize with user info', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    const authorized = dc.authorize('user-1', 'user@example.com', 'user')
    expect(authorized.status).toBe(DeviceCodeStatus.AUTHORIZED)
    expect(authorized.userId).toBe('user-1')
    expect(authorized.userEmail).toBe('user@example.com')
    expect(authorized.userRole).toBe('user')
  })

  it('should not authorize an expired code', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(() => dc.authorize('user-1', 'u@e.com', 'user')).toThrow('Device code 已過期')
  })

  it('should not authorize twice', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    expect(() => authorized.authorize('user-2', 'u2@e.com', 'user')).toThrow(
      '此 device code 已被授權',
    )
  })

  it('should mark as consumed', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    const consumed = authorized.consume()
    expect(consumed.status).toBe(DeviceCodeStatus.CONSUMED)
  })

  it('should generate a valid user code (8 chars, alphanumeric uppercase)', () => {
    const code = DeviceCode.generateUserCode()
    expect(code).toHaveLength(8)
    expect(code).toMatch(/^[A-Z0-9]{8}$/)
  })
})
