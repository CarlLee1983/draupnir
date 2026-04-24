import type { CookieOptions, PendingCookie } from './IHttpContext'

/**
 * Builds a Set-Cookie header string from name, value, and options.
 *
 * @param name - The cookie name.
 * @param value - The cookie value.
 * @param options - Cookie attributes (Path, Max-Age, HttpOnly, etc.).
 * @returns A formatted 'Set-Cookie' header value.
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
 * Applies pending cookies from the context queue to a Response.
 *
 * If the response is an instance of Response, it creates a new Response with
 * additional 'Set-Cookie' headers. Returns the original response unchanged
 * if no cookies are pending.
 *
 * @param response - The original response.
 * @param pendingCookies - The array of cookies to apply.
 * @returns A new response with cookies applied, or the original response.
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
