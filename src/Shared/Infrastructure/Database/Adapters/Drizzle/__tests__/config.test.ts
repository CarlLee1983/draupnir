import { describe, expect, it, afterEach } from 'bun:test'
import { initializeDrizzle, getDrizzleInstance } from '../config'

describe('Drizzle Config', () => {
  afterEach(() => {
    // 雖然無法直接重置模組內的私有變數 db，
    // 但我們可以驗證它是 Singleton 行為
  })

  it('should initialize and return the same instance (singleton)', () => {
    const db1 = initializeDrizzle()
    const db2 = getDrizzleInstance()
    const db3 = initializeDrizzle()

    expect(db1).toBeDefined()
    expect(db2).toBe(db1)
    expect(db3).toBe(db1)
  })
})
