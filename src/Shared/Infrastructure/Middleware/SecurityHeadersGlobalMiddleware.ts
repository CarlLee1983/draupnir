import type { GravitoMiddleware } from '@gravito/core'

/**
 * Global security response headers middleware.
 *
 * Appends defensive HTTP headers to every response that leaves the server.
 * Register via `core.adapter.useGlobal(createSecurityHeadersMiddleware())`.
 *
 * Headers applied:
 * - `X-Content-Type-Options: nosniff`       — Prevent MIME sniffing.
 * - `X-Frame-Options: SAMEORIGIN`           — Block clickjacking from foreign frames.
 * - `Referrer-Policy: strict-origin-when-cross-origin` — Limit referrer leakage.
 * - `X-XSS-Protection: 0`                  — Disable legacy browser XSS filter (use CSP instead).
 *
 * @example
 * ```ts
 * core.adapter.useGlobal(createSecurityHeadersMiddleware())
 * ```
 */
export function createSecurityHeadersMiddleware(): GravitoMiddleware {
  return async (ctx, next) => {
    await next()

    if (!ctx.res) return

    const headers = new Headers(ctx.res.headers)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'SAMEORIGIN')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('X-XSS-Protection', '0')

    ctx.res = new Response(ctx.res.body, {
      status: ctx.res.status,
      statusText: ctx.res.statusText,
      headers,
    })
  }
}
