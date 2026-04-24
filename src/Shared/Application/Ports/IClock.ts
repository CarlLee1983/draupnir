/**
 * Clock abstraction — tests can inject a controllable fake clock.
 *
 * Only the current wall-clock time belongs here. Periodic scheduling should use IScheduler.
 */
export interface IClock {
  /** Current wall-clock time as a Date instance. */
  now(): Date

  /** Current time formatted as ISO-8601 string. */
  nowIso(): string
}
