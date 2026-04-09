// src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import { InitiateDeviceFlowService } from '../Application/Services/InitiateDeviceFlowService'

describe('InitiateDeviceFlowService', () => {
  let store: MemoryDeviceCodeStore
  let service: InitiateDeviceFlowService

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
    service = new InitiateDeviceFlowService(store, 'https://app.draupnir.dev/cli/verify')
  })

  it('should generate device_code and user_code', async () => {
    const result = await service.execute()
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.deviceCode).toBeTruthy()
    expect(result.data!.userCode).toHaveLength(8)
    expect(result.data!.verificationUri).toBe('https://app.draupnir.dev/cli/verify')
    expect(result.data!.expiresIn).toBe(600) // 10 minutes
    expect(result.data!.interval).toBe(5) // 5 seconds polling
  })

  it('should store the device code in the store', async () => {
    const result = await service.execute()
    const stored = await store.findByDeviceCode(result.data!.deviceCode)
    expect(stored).not.toBeNull()
    expect(stored!.userCode).toBe(result.data!.userCode)
  })

  it('should generate unique codes on each call', async () => {
    const result1 = await service.execute()
    const result2 = await service.execute()
    expect(result1.data!.deviceCode).not.toBe(result2.data!.deviceCode)
    expect(result1.data!.userCode).not.toBe(result2.data!.userCode)
  })
})
