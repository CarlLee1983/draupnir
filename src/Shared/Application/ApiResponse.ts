export interface PaginationMeta {
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly code?: string
  readonly meta?: PaginationMeta
}

export function successResponse<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return { success: true, data, ...(meta && { meta }) }
}

export function errorResponse(error: string, code?: string): ApiResponse<never> {
  return { success: false, error, ...(code && { code }) }
}
