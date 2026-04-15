import { describe, expect, it, vi } from 'vitest'
import { GracefulShutdown } from '../GracefulShutdown'
import type { IShutdownHook } from '../IShutdownHook'

const makeHook = (name: string, impl?: () => Promise<void>): IShutdownHook => ({
  name,
  shutdown: impl ?? vi.fn().mockResolvedValue(undefined),
})

describe('GracefulShutdown', () => {
  it('execute() 依序呼叫所有 hook', async () => {
    const order: string[] = []
    const a = makeHook('A', async () => { order.push('A') })
    const b = makeHook('B', async () => { order.push('B') })

    const shutdown = new GracefulShutdown(5000)
    shutdown.register(a, b)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    await shutdown.execute('SIGTERM')

    expect(order).toEqual(['A', 'B'])
    expect(exitSpy).toHaveBeenCalledWith(0)
    exitSpy.mockRestore()
  })

  it('單一 hook 失敗不中斷後續 hook', async () => {
    const order: string[] = []
    const bad = makeHook('BAD', async () => { throw new Error('boom') })
    const good = makeHook('GOOD', async () => { order.push('GOOD') })

    const shutdown = new GracefulShutdown(5000)
    shutdown.register(bad, good)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    await shutdown.execute('SIGTERM')

    expect(order).toEqual(['GOOD'])
    expect(exitSpy).toHaveBeenCalledWith(0)
    exitSpy.mockRestore()
  })

  it('hook 超時時不等待，繼續執行下一個 hook', async () => {
    const order: string[] = []
    const slow = makeHook('SLOW', () => new Promise(() => {})) // 永不 resolve
    const fast = makeHook('FAST', async () => { order.push('FAST') })

    const shutdown = new GracefulShutdown(50) // 50ms timeout
    shutdown.register(slow, fast)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    await shutdown.execute('SIGTERM')

    expect(order).toEqual(['FAST'])
    expect(exitSpy).toHaveBeenCalledWith(0)
    exitSpy.mockRestore()
  })

  it('register() 支援鏈式呼叫', () => {
    const shutdown = new GracefulShutdown(5000)
    const result = shutdown.register(makeHook('A'))
    expect(result).toBe(shutdown)
  })
})
