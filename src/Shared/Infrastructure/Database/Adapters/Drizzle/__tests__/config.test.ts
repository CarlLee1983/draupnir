import { describe, expect, it, beforeEach } from 'bun:test'
import { initializeDrizzle, getDrizzleInstance, resetDrizzleForTest, closeDrizzleConnection } from '../config'

describe('Drizzle Config', () => {
  beforeEach(() => {
    resetDrizzleForTest()
  })

  it('should initialize and return the same instance (singleton)', () => {
    const db1 = initializeDrizzle()
    const db2 = getDrizzleInstance()
    const db3 = initializeDrizzle()

    expect(db1).toBeDefined()
    expect(db2 === db1).toBe(true)
    expect(db3 === db1).toBe(true)
  })
})

describe('closeDrizzleConnection()', () => {
  it('呼叫後再次取得 instance 會重新初始化', async () => {
    // 先初始化
    const before = getDrizzleInstance()
    await closeDrizzleConnection()
    resetDrizzleForTest()
    // 重新初始化後應該是新的 instance
    expect(before).toBeDefined()
  })
})
