const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

export class BifrostApiError extends Error {
  readonly status: number
  readonly endpoint: string
  readonly responseBody: unknown
  readonly isRetryable: boolean

  constructor(status: number, endpoint: string, message: string, responseBody?: unknown) {
    super(`Bifrost API error ${status} on ${endpoint}: ${message}`)
    this.name = 'BifrostApiError'
    this.status = status
    this.endpoint = endpoint
    this.responseBody = responseBody
    this.isRetryable = RETRYABLE_STATUS_CODES.has(status)
  }
}

export function isBifrostApiError(error: unknown): error is BifrostApiError {
  return error instanceof BifrostApiError
}
