import { describe, expect, it, vi } from 'vitest'
import { BunServerShutdownHook } from '../hooks/BunServerShutdownHook'

describe('BunServerShutdownHook', () => {
  it('name 為 "BunServer"', () => {
    const server: { stop(): Promise<void> } = {
      stop: vi.fn().mockResolvedValue(undefined),
    }
    const hook = new BunServerShutdownHook(server)
    expect(hook.name).toBe('BunServer')
  })

  it('shutdown() 呼叫 server.stop()', async () => {
    const server: { stop(): Promise<void> } = {
      stop: vi.fn().mockResolvedValue(undefined),
    }
    const hook = new BunServerShutdownHook(server)
    await hook.shutdown()
    expect(server.stop).toHaveBeenCalledOnce()
  })
})
