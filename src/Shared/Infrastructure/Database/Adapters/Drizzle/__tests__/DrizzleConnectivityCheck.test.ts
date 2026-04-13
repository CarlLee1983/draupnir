import { describe, expect, it, spyOn } from 'bun:test'
import { createDrizzleConnectivityCheck } from '../DrizzleConnectivityCheck'
import * as config from '../config'

describe('DrizzleConnectivityCheck', () => {
  it('should return true when database is reachable', async () => {
    // 模擬成功執行 SELECT 1
    const mockDb = {
      execute: async () => [{ '1': 1 }],
      run: async () => ({}),
    }
    spyOn(config, 'getDrizzleInstance').mockReturnValue(mockDb as any)

    const check = createDrizzleConnectivityCheck()
    const result = await check.ping()
    expect(result).toBe(true)
  })

  it('should return false when database execution fails', async () => {
    // 模擬執行失敗
    const mockDb = {
      execute: async () => {
        throw new Error('Connection failed')
      },
    }
    spyOn(config, 'getDrizzleInstance').mockReturnValue(mockDb as any)

    const check = createDrizzleConnectivityCheck()
    const result = await check.ping()
    expect(result).toBe(false)
  })
})
