import { describe, expect, it, beforeEach } from 'bun:test'
import { initializeDrizzle, getDrizzleInstance, resetDrizzleForTest } from '../config'

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
