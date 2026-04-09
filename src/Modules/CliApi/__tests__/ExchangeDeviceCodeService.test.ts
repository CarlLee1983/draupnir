// src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import { ExchangeDeviceCodeService } from '../Application/Services/ExchangeDeviceCodeService'
import { DeviceCode } from '../Domain/ValueObjects/DeviceCode'
import { JwtTokenService } from '@/Modules/Auth/Application/Services/JwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'

function createMockAuthTokenRepo(): IAuthTokenRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue([]),
    isRevoked: vi.fn().mockResolvedValue(false),
    revokeAll: vi.fn().mockResolvedValue(undefined),
    revoke: vi.fn().mockResolvedValue(undefined),
    deleteExpired: vi.fn().mockResolvedValue(0),
  } as unknown as IAuthTokenRepository
}

describe('ExchangeDeviceCodeService', () => {
  let store: MemoryDeviceCodeStore
  let service: ExchangeDeviceCodeService
  let jwtService: JwtTokenService
  let mockAuthTokenRepo: IAuthTokenRepository

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
    jwtService = new JwtTokenService()
    mockAuthTokenRepo = createMockAuthTokenRepo()
    service = new ExchangeDeviceCodeService(store, jwtService, mockAuthTokenRepo)
  })

  it('should return authorization_pending when code is not yet authorized', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-pending',
      userCode: 'PEND1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const result = await service.execute({ deviceCode: 'dc-pending' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('authorization_pending')
  })

  it('should return tokens when code is authorized', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-auth',
      userCode: 'AUTH5678',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const authorized = dc.authorize('user-1', 'user@example.com', 'user')
    await store.update(authorized)

    const result = await service.execute({ deviceCode: 'dc-auth' })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.accessToken).toBeTruthy()
    expect(result.data!.refreshToken).toBeTruthy()
    expect(result.data!.user.id).toBe('user-1')
    expect(result.data!.user.email).toBe('user@example.com')
  })

  it('should consume the device code after token exchange', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-consume',
      userCode: 'CONS1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    await store.update(authorized)

    await service.execute({ deviceCode: 'dc-consume' })
    const afterExchange = await store.findByDeviceCode('dc-consume')
    expect(afterExchange!.status).toBe('consumed')
  })

  it('should reject invalid device code', async () => {
    const result = await service.execute({ deviceCode: 'non-existent' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('invalid_device_code')
  })

  it('should reject expired device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-exp',
      userCode: 'EXPD9999',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    // Directly set in internal map to bypass expiry check on save
    await store.save(dc)

    const result = await service.execute({ deviceCode: 'dc-exp' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('invalid_device_code')
  })

  it('should save auth tokens to repository', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-save-tok',
      userCode: 'SAVE1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    await store.update(authorized)

    await service.execute({ deviceCode: 'dc-save-tok' })
    expect(mockAuthTokenRepo.save).toHaveBeenCalledTimes(2) // access + refresh
  })
})
