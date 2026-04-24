import type { IScheduler, JobSpec } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

interface Registration {
  readonly spec: JobSpec
  readonly handler: () => Promise<void>
}

/**
 * Test fake for IScheduler. Registration is captured; jobs never run automatically.
 */
export class ManualScheduler implements IScheduler {
  private readonly registrations = new Map<string, Registration>()

  schedule(spec: JobSpec, handler: () => Promise<void>): void {
    if (this.registrations.has(spec.name)) {
      throw new Error(`duplicate job name: ${spec.name}`)
    }

    this.registrations.set(spec.name, { spec, handler })
  }

  unschedule(name: string): void {
    this.registrations.delete(name)
  }

  has(name: string): boolean {
    return this.registrations.has(name)
  }

  stopAll(): void {
    this.registrations.clear()
  }

  /** Manually fire a registered job's handler. */
  async trigger(name: string): Promise<void> {
    const registration = this.registrations.get(name)
    if (!registration) {
      throw new Error(`ManualScheduler: job not registered: ${name}`)
    }

    await registration.handler()
  }

  registeredJobs(): readonly string[] {
    return [...this.registrations.keys()]
  }
}
