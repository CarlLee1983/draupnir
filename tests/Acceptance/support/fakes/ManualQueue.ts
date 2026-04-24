import type { IQueue, JobOptions } from '@/Foundation/Infrastructure/Ports/Queue/IQueue'

interface RegisteredProcess {
  readonly handler: (payload: unknown) => Promise<void>
  readonly concurrency: number
}

/**
 * Test fake for IQueue.
 *
 * It records registered processors and push calls, but never starts background workers.
 */
export class ManualQueue implements IQueue {
  private readonly processes = new Map<string, RegisteredProcess>()
  private readonly pushes: Array<{ readonly name: string; readonly payload: unknown }> = []
  private counter = 0
  private paused = false
  private closed = false

  async push(name: string, payload: unknown, _options?: JobOptions): Promise<string> {
    this.pushes.push({ name, payload })
    this.counter += 1
    return `manual-job-${String(this.counter).padStart(6, '0')}`
  }

  process(name: string, handler: (payload: unknown) => Promise<void>, concurrency = 1): void {
    if (this.processes.has(name)) {
      throw new Error(`duplicate queue processor: ${name}`)
    }

    this.processes.set(name, { handler, concurrency })
  }

  async pause(): Promise<void> {
    this.paused = true
  }

  async resume(): Promise<void> {
    this.paused = false
  }

  async close(): Promise<void> {
    this.closed = true
  }

  /** Manually run a registered processor. */
  async trigger(name: string, payload: unknown): Promise<void> {
    const registration = this.processes.get(name)
    if (!registration) {
      throw new Error(`ManualQueue: processor not registered: ${name}`)
    }

    await registration.handler(payload)
  }

  /** Reset call logs and control flags while preserving registered processors. */
  reset(): void {
    this.pushes.length = 0
    this.paused = false
    this.closed = false
    this.counter = 0
  }

  registeredProcesses(): readonly string[] {
    return [...this.processes.keys()]
  }

  calls(): readonly { readonly name: string; readonly payload: unknown }[] {
    return [...this.pushes]
  }

  isPaused(): boolean {
    return this.paused
  }

  isClosed(): boolean {
    return this.closed
  }
}
