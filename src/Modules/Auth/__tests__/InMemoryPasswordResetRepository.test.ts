import { describe, expect, test, beforeEach } from 'bun:test'
import { InMemoryPasswordResetRepository } from '../Infrastructure/Repositories/InMemoryPasswordResetRepository'

describe('InMemoryPasswordResetRepository', () => {
  let repo: InMemoryPasswordResetRepository

  beforeEach(() => {
    repo = new InMemoryPasswordResetRepository()
  })

  test('creates and retrieves token by value', async () => {
    const token = await repo.create('user@example.com')
    expect(token.isValid()).toBe(true)

    const found = await repo.findByToken(token.token)
    expect(found).not.toBeNull()
    expect(found!.email).toBe('user@example.com')
  })

  test('returns null for unknown token', async () => {
    const result = await repo.findByToken('nonexistent')
    expect(result).toBeNull()
  })

  test('markUsed updates token', async () => {
    const token = await repo.create('user@example.com')
    await repo.markUsed(token.token)

    const found = await repo.findByToken(token.token)
    expect(found!.used).toBe(true)
    expect(found!.isValid()).toBe(false)
  })
})
