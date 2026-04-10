import { BifrostApiError } from './errors'

export interface RetryOptions {
  readonly maxRetries: number
  readonly baseDelayMs: number
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
}

function isRetryable(error: unknown): boolean {
  if (error instanceof BifrostApiError) {
    return error.isRetryable
  }
  return error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))
}

function calculateDelay(attempt: number, baseDelayMs: number): number {
  const exponentialDelay = baseDelayMs * 2 ** attempt
  const jitter = Math.random() * baseDelayMs
  return exponentialDelay + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
