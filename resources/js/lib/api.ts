/**
 * Dashboard API library for Gravito Draupnir
 * Handles JSON fetching with support for success flags and typed responses.
 */

export interface ApiResponse<T = unknown> {
  success?: boolean
  message?: string
  error?: string
  data?: T
}

/**
 * Robust JSON fetch wrapper that handles common API patterns and signals.
 */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  // Handle network or system level failures
  if (!response.ok && response.status >= 500) {
    throw new Error(`Server error: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as ApiResponse<T>

  // Handle business logic failures
  if (payload.success === false) {
    throw new Error(payload.error ?? payload.message ?? `Request failed with ${response.status}`)
  }

  // Handle missing data envelope
  if (!payload.data) {
    if (response.ok) return {} as T // Allow empty success data if needed
    throw new Error('Malformed API response: missing data')
  }

  return payload.data
}

/**
 * Standardized API client object
 */
export const api = {
  get: <T>(url: string, signal?: AbortSignal) => fetchJson<T>(url, signal),
  
  // Future methods can be added here
  // post: <T>(url: string, body: any, signal?: AbortSignal) => ...
}
