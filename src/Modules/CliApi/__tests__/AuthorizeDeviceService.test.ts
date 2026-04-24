// src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthorizeDeviceService } from '../Application/Services/AuthorizeDeviceService'
import { DeviceCode } from '../Domain/ValueObjects/DeviceCode'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'

describe('AuthorizeDeviceService', () => {
  let store: MemoryDeviceCodeStore
  let service: AuthorizeDeviceService

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
    service = new AuthorizeDeviceService(store)
  })

  it('should authorize a pending device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-1',
      userCode: 'AUTH1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const result = await service.execute({
      userCode: 'AUTH1234',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain('authorized successfully')

    const updated = await store.findByDeviceCode('dc-1')
    expect(updated?.status).toBe('authorized')
    expect(updated?.userId).toBe('user-1')
  })

  it('should reject invalid user code', async () => {
    const result = await service.execute({
      userCode: 'INVALID1',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_USER_CODE')
  })

  it('should reject expired device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-exp',
      userCode: 'EXPD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    await store.save(dc)

    const result = await service.execute({
      userCode: 'EXPD1234',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('EXPIRED')
  })

  it('should reject empty user code', async () => {
    const result = await service.execute({
      userCode: '',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_CODE_REQUIRED')
  })
})
