/**
 * Queue Service Interface (Port)
 *
 * Defines the contract for producer/consumer operations.
 */

export interface JobOptions {
  /** Optional job name for logging/debugging. */
  jobName?: string
  /** Maximum number of retry attempts. */
  attempts?: number
  /** Delay before the first attempt (ms). */
  delay?: number
  /** Backoff delay for retries (ms). */
  backoffMs?: number
  /** Priority of the job (lower is higher). */
  priority?: number
  /** Whether to remove the job from Redis on success. */
  removeOnComplete?: boolean | number
  /** Whether to remove the job from Redis on failure. */
  removeOnFail?: boolean | number
}

export interface IQueue {
  /**
   * Push a job into the queue (Producer).
   *
   * @param name - Task type name.
   * @param payload - Data to be processed.
   * @param options - Execution options.
   * @returns The generated job ID.
   */
  push(name: string, payload: unknown, options?: JobOptions): Promise<string>

  /**
   * Register a task handler (Consumer/Worker).
   *
   * @param name - Task type name.
   * @param handler - Function to process the payload.
   * @param concurrency - Number of concurrent jobs to process.
   */
  process(name: string, handler: (payload: unknown) => Promise<void>, concurrency?: number): void

  /** Pause workers from picking up new jobs. */
  pause(): Promise<void>

  /** Resume workers. */
  resume(): Promise<void>

  /** Fully stop and disconnect all queue resources. */
  close(): Promise<void>
}
