import type { IShutdownHook } from './IShutdownHook'

/**
 * Orchestrator for graceful application shutdown.
 *
 * @remarks
 * This class allows registering multiple shutdown hooks (e.g., database closing,
 * queue draining) and triggers them sequentially when a process signal (SIGTERM, SIGINT)
 * is received.
 */
export class GracefulShutdown {
  private readonly hooks: IShutdownHook[] = []
  private listening = false

  /**
   * Initializes the shutdown orchestrator.
   *
   * @param drainTimeoutMs - Maximum time allowed for all hooks to complete before forcing exit
   */
  constructor(private readonly drainTimeoutMs: number) {}

  /**
   * Registers one or more shutdown hooks.
   *
   * @param hooks - The shutdown hooks to register
   * @returns The GracefulShutdown instance for chaining
   */
  register(...hooks: IShutdownHook[]): this {
    this.hooks.push(...hooks)
    return this
  }

  /**
   * Starts listening for the specified process signals.
   *
   * @param signals - Array of Node.js signals to listen for (defaults to SIGTERM, SIGINT)
   */
  listen(signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']): void {
    if (this.listening) return
    this.listening = true
    for (const signal of signals) {
      process.once(signal, () => {
        void this.execute(signal)
      })
    }
  }

  /**
   * Manually triggers the shutdown sequence.
   *
   * @param signal - The signal or reason for shutdown (used for logging)
   * @returns A promise that resolves when the process exits
   */
  async execute(signal: string): Promise<never> {
    console.log(`[shutdown] ${signal} received — drainTimeout=${this.drainTimeoutMs}ms`)
    for (const hook of this.hooks) {
      await this.runHook(hook)
    }
    console.log('[shutdown] All hooks completed — exiting with code 0')
    return process.exit(0)
  }

  /**
   * Executes a single shutdown hook with timeout protection.
   *
   * @param hook - The shutdown hook to execute
   */
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
