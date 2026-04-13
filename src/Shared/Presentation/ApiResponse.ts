/**
 * API Response Formatter
 *
 * Unifies all API response formats across the platform.
 */
export interface ApiResponseData {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
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
    [key: string]: any
  }
}

export class ApiResponse {
  /**
   * Successful response.
   */
  static success(data: any, meta?: any): ApiResponseData {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }
  }

  /**
   * Error response.
   */
  static error(code: string, message: string, details?: any): ApiResponseData {
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
  }

  /**
   * Paginated list response (including pagination metadata).
   */
  static paginated(items: any[], total: number, limit: number, offset: number): ApiResponseData {
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
  }
}
