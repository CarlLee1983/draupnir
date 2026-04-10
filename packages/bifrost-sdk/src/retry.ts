import { BifrostApiError } from './errors'

/** Retry behavior configuration. */
export interface RetryOptions {
  /** Maximum number of retries (excluding the initial attempt). */
  readonly maxRetries: number
  /** Base delay (ms); actual delay increases with exponential backoff and random jitter. */
  readonly baseDelayMs: number
}

/** Default retry options: max 3 retries, 500ms base delay. */
const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
}

/**
 * Determines if an error should be retried.
 *
 * Retryable cases:
 * - {@link BifrostApiError} and `isRetryable` is `true` (429, 5xx)
 * - `TypeError` (usually network errors)
 * - Error messages containing `"fetch"`
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof BifrostApiError) {
    return error.isRetryable
  }
  return error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))
}

/**
 * Calculates exponential backoff delay (including random jitter).
 *
 * @param attempt - Current attempt count (starting from 0)
 * @param baseDelayMs - Base delay (ms)
 * @returns Delay duration (ms), following the formula `baseDelayMs * 2^attempt + random(0, baseDelayMs)`
 */
function calculateDelay(attempt: number, baseDelayMs: number): number {
  const exponentialDelay = baseDelayMs * 2 ** attempt
  const jitter = Math.random() * baseDelayMs
  return exponentialDelay + jitter
}

/**
 * Waits for a specified duration.
 * @param ms - Milliseconds to wait
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retries an asynchronous operation using an exponential backoff strategy.
 *
 * Only retries on retryable errors (see {@link isRetryable});
 * non-retryable errors are thrown immediately.
 *
 * @typeParam T - Operation return type
 * @param fn - Asynchronous function to execute
 * @param options - Retry options (can partially override default values)
 * @returns Operation result
 * @throws The error from the final attempt (when retries are exhausted) or a non-retryable error
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 5, baseDelayMs: 1000 },
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const { maxRetries, baseDelayMs } = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRetryable(error)) {
        throw error
      }
      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, baseDelayMs)
        await sleep(delay)
      }
    }
  }

  throw lastError
}
