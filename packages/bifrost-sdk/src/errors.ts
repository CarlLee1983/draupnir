/** Collection of retryable HTTP status codes (429 Too Many Requests, 5xx Server Error). */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

/**
 * Bifrost API error, including HTTP status code, endpoint path, and response content.
 *
 * @example
 * ```ts
 * try {
 *   await client.getVirtualKey('non-existent')
 * } catch (error) {
 *   if (isBifrostApiError(error) && error.status === 404) {
 *     // Handle not found case
 *   }
 * }
 * ```
 */
export class BifrostApiError extends Error {
  /** HTTP status code. */
  readonly status: number
  /** The requested API endpoint path. */
  readonly endpoint: string
  /** Original response content (JSON or plain text). */
  readonly responseBody: unknown
  /** Whether the error is retryable (429, 5xx). */
  readonly isRetryable: boolean

  /**
   * @param status - HTTP status code
   * @param endpoint - API endpoint path
   * @param message - Error message
   * @param responseBody - Original response body
   */
  constructor(status: number, endpoint: string, message: string, responseBody?: unknown) {
    super(`Bifrost API error ${status} on ${endpoint}: ${message}`)
    this.name = 'BifrostApiError'
    this.status = status
    this.endpoint = endpoint
    this.responseBody = responseBody
    this.isRetryable = RETRYABLE_STATUS_CODES.has(status)
  }
}

/**
 * Type guard: determines if `error` is a {@link BifrostApiError}.
 *
 * @param error - The error object to check
 * @returns Returns `true` if it is a `BifrostApiError`
 */
export function isBifrostApiError(error: unknown): error is BifrostApiError {
  return error instanceof BifrostApiError
}
