import type { IScheduler } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IShutdownHook } from '../IShutdownHook'

/**
 * Shutdown hook for stopping the centralized task scheduler.
 */
export class SchedulerShutdownHook implements IShutdownHook {
  /** Resource name. */
  readonly name = 'Scheduler'

  /**
   * Initializes the hook with a scheduler instance.
   * @param scheduler - The scheduler implementation to stop
   */
  constructor(private readonly scheduler: IScheduler) {}

  /**
   * Stops all scheduled jobs.
   * @returns A promise that resolves immediately
   */
  shutdown(): Promise<void> {
    this.scheduler.stopAll()
    return Promise.resolve()
  }
}
