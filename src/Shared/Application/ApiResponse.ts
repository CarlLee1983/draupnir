/**
 * Metadata for paginated responses.
 */
export interface PaginationMeta {
  /** The total number of items available. */
  readonly total: number
  /** The current page number. */
  readonly page: number
  /** The maximum number of items per page. */
  readonly limit: number
  /** The total number of pages available. */
  readonly totalPages: number
}

/**
 * Standard envelope for all API responses.
 *
 * @template T The type of the data returned in the response.
 */
export interface ApiResponse<T = unknown> {
  /** Indicates if the request was successful. */
  readonly success: boolean
  /** The payload of the response. */
  readonly data?: T
  /** User-friendly error message. */
  readonly error?: string
  /** Machine-readable error code. */
  readonly code?: string
  /** Optional pagination metadata. */
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
