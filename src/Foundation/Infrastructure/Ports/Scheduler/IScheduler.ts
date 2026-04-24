/**
 * Immutable job definition consumed by scheduler implementations.
 */
export interface JobSpec {
  /** Unique job key for duplicate detection, logging, and unschedule(). */
  readonly name: string
  /** Croner-compatible expression forwarded to the underlying cron engine. */
  readonly cron: string
  /** Optional IANA timezone forwarded to cron parsing. */
  readonly timezone?: string
  /** Queue the handler once on a microtask immediately after registration. */
  readonly runOnInit?: boolean
  /** Maximum retry attempts after the initial failure; absent or 0 disables retries. */
  readonly maxRetries?: number
  /** Base backoff in milliseconds; retry delay = backoffMs * 2^attempt. */
  readonly backoffMs?: number
}

/**
 * Interface for the centralized task scheduler.
 */
export interface IScheduler {
  /**
   * Schedules a job for periodic execution.
   *
   * @param spec - The job specification
   * @param handler - The function to execute according to the schedule
   */
  schedule(spec: JobSpec, handler: () => Promise<void>): void

  /**
   * Removes a job from the scheduler.
   *
   * @param name - The unique name of the job to unschedule
   */
  unschedule(name: string): void

  /**
   * Checks if a job with the given name is currently scheduled.
   *
   * @param name - The job name to check
   * @returns True if the job exists, false otherwise
   */
  has(name: string): boolean

  /**
   * Stops all scheduled jobs (used for graceful shutdown).
   */
  stopAll(): void
}
