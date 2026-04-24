import type { IShutdownHook } from './IShutdownHook'

export class GracefulShutdown {
  private readonly hooks: IShutdownHook[] = []
  private listening = false

  constructor(private readonly drainTimeoutMs: number) {}

  register(...hooks: IShutdownHook[]): this {
    this.hooks.push(...hooks)
    return this
  }

  listen(signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']): void {
    if (this.listening) return
    this.listening = true
    for (const signal of signals) {
      process.once(signal, () => {
        void this.execute(signal)
      })
    }
  }

  async execute(signal: string): Promise<never> {
    console.log(`[shutdown] ${signal} received — drainTimeout=${this.drainTimeoutMs}ms`)
    for (const hook of this.hooks) {
      await this.runHook(hook)
    }
    console.log('[shutdown] All hooks completed — exiting with code 0')
    return process.exit(0)
  }

  private async runHook(hook: IShutdownHook): Promise<void> {
    console.log(`[shutdown] ${hook.name} closing...`)
    const start = Date.now()

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<'timeout'>((resolve) => {
      timeoutId = setTimeout(() => resolve('timeout'), this.drainTimeoutMs)
    })
    const task = hook
      .shutdown()
      .then(() => 'done' as const)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[shutdown] ${hook.name} failed: ${msg}`)
        return 'error' as const
      })

    const result = await Promise.race([task, timeout])
    if (timeoutId) clearTimeout(timeoutId)
    const elapsed = Date.now() - start

    if (result === 'timeout') {
      console.warn(`[shutdown] ${hook.name} timed out after ${this.drainTimeoutMs}ms, forcing`)
    } else if (result === 'done') {
      console.log(`[shutdown] ${hook.name} closed (${elapsed}ms)`)
    }
  }
}
