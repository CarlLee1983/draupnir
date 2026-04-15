import type { IShutdownHook } from '../IShutdownHook'
import type { IScheduler } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

export class SchedulerShutdownHook implements IShutdownHook {
  readonly name = 'Scheduler'

  constructor(private readonly scheduler: IScheduler) {}

  shutdown(): Promise<void> {
    this.scheduler.stopAll()
    return Promise.resolve()
  }
}
