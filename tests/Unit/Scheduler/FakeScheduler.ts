import type { IScheduler, JobSpec } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

type ScheduledJob = {
  spec: JobSpec
  handler: () => Promise<void>
}

export class FakeScheduler implements IScheduler {
  readonly scheduled = new Map<string, ScheduledJob>()

  schedule(spec: JobSpec, handler: () => Promise<void>): void {
    if (this.scheduled.has(spec.name)) {
      throw new Error(`duplicate job name: ${spec.name}`)
    }
    this.scheduled.set(spec.name, { spec, handler })
  }

  unschedule(name: string): void {
    this.scheduled.delete(name)
  }

  has(name: string): boolean {
    return this.scheduled.has(name)
  }

  async trigger(name: string): Promise<void> {
    const job = this.scheduled.get(name)
    if (!job) {
      throw new Error(`no scheduled job: ${name}`)
    }
    await job.handler()
  }
}
