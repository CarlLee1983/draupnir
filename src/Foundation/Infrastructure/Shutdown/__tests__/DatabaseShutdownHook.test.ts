import { describe, expect, it, vi } from 'vitest'
import { DatabaseShutdownHook } from '../hooks/DatabaseShutdownHook'

describe('DatabaseShutdownHook', () => {
  it('name 為 "Database"', () => {
    expect(new DatabaseShutdownHook(vi.fn()).name).toBe('Database')
  })

  it('shutdown() 呼叫傳入的 close 函式', async () => {
    const close = vi.fn().mockResolvedValue(undefined)
    await new DatabaseShutdownHook(close).shutdown()
    expect(close).toHaveBeenCalledOnce()
  })
})
