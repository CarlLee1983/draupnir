import type { CookieOptions, PendingCookie } from './IHttpContext'

/**
 * Builds a Set-Cookie header string from name, value, and options.
 */
export function buildCookieString(name: string, value: string, options: CookieOptions): string {
  const parts: string[] = [`${name}=${value}`]

  parts.push(`Path=${options.path ?? '/'}`)

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }
  if (options.httpOnly) {
    parts.push('HttpOnly')
  }
  if (options.secure) {
    parts.push('Secure')
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }

  return parts.join('; ')
}

/**
 * Applies pending cookies from ctx.__pending_cookies__ to a Response.
 * Returns the original response unchanged if no cookies are pending.
 */
export function applyPendingCookies(response: Response, pendingCookies: PendingCookie[]): Response {
  if (pendingCookies.length === 0) return response

  const headers = new Headers(response.headers)
  for (const { name, value, options } of pendingCookies) {
    headers.append('Set-Cookie', buildCookieString(name, value, options))
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
