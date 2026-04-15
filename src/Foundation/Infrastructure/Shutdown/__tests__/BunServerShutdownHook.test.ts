import { describe, expect, it, vi } from 'vitest'
import { BunServerShutdownHook } from '../hooks/BunServerShutdownHook'

describe('BunServerShutdownHook', () => {
  it('name 為 "BunServer"', () => {
    const server = { stop: vi.fn().mockResolvedValue(undefined) }
    const hook = new BunServerShutdownHook(server as any)
    expect(hook.name).toBe('BunServer')
  })

  it('shutdown() 呼叫 server.stop()', async () => {
    const server = { stop: vi.fn().mockResolvedValue(undefined) }
    const hook = new BunServerShutdownHook(server as any)
    await hook.shutdown()
    expect(server.stop).toHaveBeenCalledOnce()
  })
})
