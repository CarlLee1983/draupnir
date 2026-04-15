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

export interface IScheduler {
  schedule(spec: JobSpec, handler: () => Promise<void>): void
  unschedule(name: string): void
  has(name: string): boolean
  /** 停止所有已排程的 job（用於 graceful shutdown）。 */
  stopAll(): void
}
