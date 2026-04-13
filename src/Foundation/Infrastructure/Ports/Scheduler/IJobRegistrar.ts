import type { IScheduler } from './IScheduler'

/**
 * Structural hook for providers that own scheduled jobs.
 *
 * Bootstrap can duck-type this method and skip providers that do not implement it.
 */
export interface IJobRegistrar {
  registerJobs(scheduler: IScheduler): void | Promise<void>
}
