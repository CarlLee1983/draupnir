/**
 * Standardized error codes for LLM Gateway failures.
 */
export type GatewayErrorCode =
  /** The requested resource (key, team, etc.) was not found. */
  | 'NOT_FOUND'
  /** The gateway is rate limiting our requests. */
  | 'RATE_LIMITED'
  /** The request payload failed gateway-side validation. */
  | 'VALIDATION'
  /** Network-level failure or gateway is unreachable. */
  | 'NETWORK'
  /** Invalid credentials or insufficient permissions. */
  | 'UNAUTHORIZED'
  /** An unclassified failure occurred. */
  | 'UNKNOWN'

/**
 * Gateway-neutral error class for ILLMGatewayClient failures.
 *
 * @remarks
 * BifrostGatewayAdapter catches BifrostApiError and re-throws as GatewayError.
 * The `code` discriminator allows callers to distinguish retryable from permanent failures
 * without importing any Bifrost-specific type.
 */
export class GatewayError extends Error {
  constructor(
    /** Descriptive error message. */
    message: string,
    /** Standardized error code. */
    readonly code: GatewayErrorCode,
    /** HTTP status code from the gateway (0 for network errors). */
    readonly statusCode: number,
    /** Whether the operation can be safely retried. */
    readonly retryable: boolean,
    /** The original underlying error if available. */
    readonly originalError?: Error,
  ) {
    super(message)
    this.name = 'GatewayError'
  }
}
