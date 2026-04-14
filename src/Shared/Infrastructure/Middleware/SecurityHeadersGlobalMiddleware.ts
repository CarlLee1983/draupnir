import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * Global security response headers middleware.
 *
 * Appends defensive HTTP headers to every response that leaves the server.
 * Register via HttpKernel.global() → GravitoKernelAdapter.registerGlobalMiddlewares().
 *
 * Headers applied:
 * - `X-Content-Type-Options: nosniff`
 * - `X-Frame-Options: SAMEORIGIN`
 * - `Referrer-Policy: strict-origin-when-cross-origin`
 * - `X-XSS-Protection: 0`
 */
export function createSecurityHeadersMiddleware(): Middleware {
  return async (_ctx, next) => {
    const response = await next()
    const headers = new Headers(response.headers)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'SAMEORIGIN')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('X-XSS-Protection', '0')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
