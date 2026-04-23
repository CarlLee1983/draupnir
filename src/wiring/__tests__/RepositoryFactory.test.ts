import { describe, expect, it } from 'bun:test'
import { getCurrentORM, getDatabaseAccess } from '../RepositoryFactory'

describe('RepositoryFactory', () => {
  it('should return a valid ORM type', () => {
    const orm = getCurrentORM()
    expect(['memory', 'atlas', 'drizzle', 'prisma']).toContain(orm)
  })

  it('should return undefined for memory ORM', () => {
    // 強制設定環境變數
    const originalORM = process.env.ORM
    process.env.ORM = 'memory'
    const db = getDatabaseAccess()
    expect(db).toBeUndefined()
    process.env.ORM = originalORM
  })

  it('should return database access for atlas ORM', () => {
    const originalORM = process.env.ORM
    process.env.ORM = 'atlas'
    const db = getDatabaseAccess()
    expect(db).toBeDefined()
    process.env.ORM = originalORM
  })

  it('should return database access for drizzle ORM', () => {
    const originalORM = process.env.ORM
    process.env.ORM = 'drizzle'
    const db = getDatabaseAccess()
    expect(db).toBeDefined()
    process.env.ORM = originalORM
  })
})
