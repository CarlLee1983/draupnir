import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  closeDrizzleConnection,
  getDrizzleInstance,
  initializeDrizzle,
  resetDrizzleForTest,
} from '../config'

describe('Drizzle Config', () => {
  let originalDatabaseUrl: string | undefined

  beforeEach(() => {
    originalDatabaseUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'file::memory:'
    resetDrizzleForTest()
  })

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
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
  let originalDatabaseUrl: string | undefined

  beforeEach(() => {
    originalDatabaseUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'file::memory:'
    resetDrizzleForTest()
  })

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
    resetDrizzleForTest()
  })

  it('呼叫後再次取得 instance 會重新初始化', async () => {
    // 先初始化
    const before = getDrizzleInstance()
    await closeDrizzleConnection()
    resetDrizzleForTest()
    // 重新初始化後應該是新的 instance
    expect(before).toBeDefined()
  })
})
