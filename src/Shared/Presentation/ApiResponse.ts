/**
 * API Response Formatter
 *
 * Unifies all API response formats across the platform.
 */
export interface ApiResponseData {
  /** Indicates if the request was successful. */
  success: boolean
  /** The payload of the response. */
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  data?: any
  /** Error information if success is false. */
  error?: {
    /** Machine-readable error code. */
    code: string
    /** User-friendly error message. */
    message: string
    /** Optional additional error details. */
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    details?: Record<string, any>
  }
  /** Response metadata. */
  meta?: {
    /** ISO timestamp of the response. */
    timestamp: string
    /** The request path. */
    path?: string
    /** Optional pagination metadata. */
    pagination?: {
      /** Total number of items. */
      total: number
      /** Maximum items per page. */
      limit: number
      /** Pagination offset. */
      offset: number
      /** Current page number (1-based). */
      page: number
      /** Total number of pages. */
      pages: number
    }
    /** Additional metadata fields. */
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    [key: string]: any
  }
}

export const ApiResponse = {
  /**
   * Successful response.
   *
   * @param data - The payload to return.
   * @param meta - Optional additional metadata.
   * @returns A standardized successful response object.
   */
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  success(data: any, meta?: any): ApiResponseData {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }
  },

  /**
   * Error response.
   *
   * @param code - Machine-readable error code.
   * @param message - User-friendly error message.
   * @param details - Optional additional error details.
   * @returns A standardized error response object.
   */
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  error(code: string, message: string, details?: any): ApiResponseData {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    }
  },

  /**
   * Paginated list response (including pagination metadata).
   *
   * @param items - The array of items for the current page.
   * @param total - Total count of matching records.
   * @param limit - Page size limit.
   * @param offset - Pagination offset.
   * @returns A standardized successful response with pagination metadata.
   */
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  paginated(items: any[], total: number, limit: number, offset: number): ApiResponseData {
    return {
      success: true,
      data: items,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1,
          pages: Math.ceil(total / limit),
        },
      },
    }
  },
}
