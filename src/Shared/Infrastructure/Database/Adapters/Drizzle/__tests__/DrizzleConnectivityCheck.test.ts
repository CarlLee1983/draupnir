import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import * as config from '../config'
import { createDrizzleConnectivityCheck } from '../DrizzleConnectivityCheck'

describe('DrizzleConnectivityCheck', () => {
  afterEach(() => {
    config.resetDrizzleForTest()
  })

  it('should return true when database is reachable', async () => {
    // Mock successful SELECT 1 execution
    const mockDb = {
      execute: async () => [{ '1': 1 }],
      run: async () => ({}),
    }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const spy = spyOn(config, 'getDrizzleInstance').mockReturnValue(mockDb as any)

    const check = createDrizzleConnectivityCheck()
    const result = await check.ping()
    expect(result).toBe(true)
    spy.mockRestore()
  })

  it('should return false when database execution fails', async () => {
    // Mock execution failure
    const mockDb = {
      execute: async () => {
        throw new Error('Connection failed')
      },
    }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const spy = spyOn(config, 'getDrizzleInstance').mockReturnValue(mockDb as any)

    const check = createDrizzleConnectivityCheck()
    const result = await check.ping()
    expect(result).toBe(false)
    spy.mockRestore()
  })
})
