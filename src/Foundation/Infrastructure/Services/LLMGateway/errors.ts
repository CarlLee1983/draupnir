/**
 * Gateway-neutral error class for ILLMGatewayClient failures.
 *
 * @remarks
 * BifrostGatewayAdapter catches BifrostApiError and re-throws as GatewayError.
 * The `code` discriminator allows callers to distinguish retryable from permanent failures
 * without importing any Bifrost-specific type.
 */

export type GatewayErrorCode =
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'VALIDATION'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'UNKNOWN'

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly code: GatewayErrorCode,
    readonly statusCode: number,
    readonly retryable: boolean,
    readonly originalError?: Error,
  ) {
    super(message)
    this.name = 'GatewayError'
  }
}
