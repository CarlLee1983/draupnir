// src/Modules/CliApi/__tests__/MemoryDeviceCodeStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { DeviceCode } from '../Domain/ValueObjects/DeviceCode'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'

describe('MemoryDeviceCodeStore', () => {
  let store: MemoryDeviceCodeStore

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
  })

  it('should save and retrieve by device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-1',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const found = await store.findByDeviceCode('dc-1')
    expect(found).not.toBeNull()
    expect(found?.deviceCode).toBe('dc-1')
  })

  it('should retrieve by user code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-2',
      userCode: 'WXYZ5678',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const found = await store.findByUserCode('WXYZ5678')
    expect(found).not.toBeNull()
    expect(found?.deviceCode).toBe('dc-2')
  })

  it('should return null for non-existent code', async () => {
    const found = await store.findByDeviceCode('non-existent')
    expect(found).toBeNull()
  })

  it('should update existing entry', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-3',
      userCode: 'CODE3333',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    await store.update(authorized)

    const found = await store.findByDeviceCode('dc-3')
    expect(found?.status).toBe('authorized')
    expect(found?.userId).toBe('user-1')
  })

  it('should delete by device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-4',
      userCode: 'DEL44444',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    await store.delete('dc-4')
    const found = await store.findByDeviceCode('dc-4')
    expect(found).toBeNull()
  })

  it('should return expired entries until cleanup()', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-5',
      userCode: 'EXP55555',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    await store.save(dc)
    const found = await store.findByDeviceCode('dc-5')
    expect(found).not.toBeNull()
    expect(found?.isExpired()).toBe(true)
  })

  it('should clean up expired entries on cleanup()', async () => {
    const expired = DeviceCode.create({
      deviceCode: 'dc-exp',
      userCode: 'EXPIRED1',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    const valid = DeviceCode.create({
      deviceCode: 'dc-valid',
      userCode: 'VALID111',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(expired)
    await store.save(valid)

    await store.cleanup()

    expect(await store.findByDeviceCode('dc-exp')).toBeNull()
    expect(await store.findByDeviceCode('dc-valid')).not.toBeNull()
  })
})
