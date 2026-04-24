/**
 * API Response Formatter
 *
 * Unifies all API response formats across the platform.
 */
export interface ApiResponseData {
  success: boolean
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  data?: any
  error?: {
    code: string
    message: string
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    details?: Record<string, any>
  }
  meta?: {
    timestamp: string
    path?: string
    pagination?: {
      total: number
      limit: number
      offset: number
      page: number
      pages: number
    }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    [key: string]: any
  }
}

export const ApiResponse = {
  /**
   * Successful response.
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
