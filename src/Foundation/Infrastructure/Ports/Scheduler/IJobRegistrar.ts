import type { IScheduler } from './IScheduler'

/**
 * Interface for service providers that own scheduled jobs.
 */
export interface IJobRegistrar {
  /**
   * Hook called during bootstrap to register module-specific scheduled jobs.
   *
   * @param scheduler - The centralized scheduler service.
   * @returns A promise that resolves when registration is complete, or void.
   */
  registerJobs(scheduler: IScheduler): void | Promise<void>
}
