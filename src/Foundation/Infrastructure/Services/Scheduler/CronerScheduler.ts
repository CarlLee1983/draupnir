import { Cron } from 'croner'
import type { IScheduler, JobSpec } from '../../Ports/Scheduler/IScheduler'

type PendingRetry = {
  timer: ReturnType<typeof setTimeout>
  resolve: () => void
}

export class CronerScheduler implements IScheduler {
  private readonly registry = new Map<string, Cron>()
  private readonly pendingRetries = new Map<string, Set<PendingRetry>>()

  schedule(spec: JobSpec, handler: () => Promise<void>): void {
    if (this.registry.has(spec.name)) {
      throw new Error(`duplicate job name: ${spec.name}`)
    }

    const job = new Cron(
      spec.cron,
      { name: spec.name, timezone: spec.timezone, unref: true },
      () => {
        void this.execute(spec, handler)
      },
    )

    this.registry.set(spec.name, job)
    this.pendingRetries.set(spec.name, new Set())

    if (spec.runOnInit) {
      queueMicrotask(() => {
        void this.execute(spec, handler)
      })
    }
  }

  unschedule(name: string): void {
    this.registry.get(name)?.stop()
    this.registry.delete(name)

    const retries = this.pendingRetries.get(name)
    if (retries) {
      for (const retry of retries) {
        clearTimeout(retry.timer)
        retry.resolve()
      }
      retries.clear()
    }

    this.pendingRetries.delete(name)
  }

  has(name: string): boolean {
    return this.registry.has(name)
  }

  stopAll(): void {
    for (const name of [...this.registry.keys()]) {
      this.unschedule(name)
    }
  }

  private async execute(spec: JobSpec, handler: () => Promise<void>): Promise<void> {
    const name = spec.name
    const maxRetries = Math.max(0, spec.maxRetries ?? 0)
    const backoffMs = Math.max(0, spec.backoffMs ?? 0)
    let attempt = 0

    while (this.registry.has(name)) {
      try {
        await handler()
        return
      } catch (error) {
        if (maxRetries <= 0) {
          return
        }
        if (attempt >= maxRetries) {
          console.error(`[Scheduler] Job '${name}' exhausted ${maxRetries} retries:`, error)
          return
        }

        const retries = this.pendingRetries.get(name)
        if (!retries || !this.registry.has(name)) {
          return
        }

        const delay = backoffMs * 2 ** attempt
        attempt += 1

        await new Promise<void>((resolve) => {
          let retry: PendingRetry
          retry = {
            timer: setTimeout(() => {
              retries.delete(retry)
              resolve()
            }, delay),
            resolve,
          }
          retries.add(retry)
        })

        if (!this.registry.has(name)) {
          return
        }
      }
    }
  }
}
