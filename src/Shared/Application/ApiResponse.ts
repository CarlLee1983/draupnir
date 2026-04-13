/**
 * Metadata for paginated responses.
 */
export interface PaginationMeta {
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
}

/**
 * Standard envelope for all API responses.
 *
 * @template T The type of the data returned in the response.
 */
export interface ApiResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly code?: string
  readonly meta?: PaginationMeta
}

/**
 * Creates a standardized successful API response envelope.
 *
 * @param data The payload to return.
 * @param meta Optional pagination metadata.
 * @returns A standardized ApiResponse object.
 */
export function successResponse<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return { success: true, data, ...(meta && { meta }) }
}

/**
 * Creates a standardized error API response envelope.
 *
 * @param error User-friendly error message.
 * @param code machine-readable error code.
 * @returns A standardized ApiResponse object with success set to false.
 */
export function errorResponse(error: string, code?: string): ApiResponse<never> {
  return { success: false, error, ...(code && { code }) }
}
