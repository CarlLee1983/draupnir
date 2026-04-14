import type { GravitoMiddleware } from '@gravito/core'

export interface CorsOptions {
  /** Allowed origins. Use `'*'` to allow any origin (not recommended with credentials). */
  allowedOrigins: string[] | '*'
  allowedMethods?: string[]
  allowedHeaders?: string[]
  exposeHeaders?: string[]
  allowCredentials?: boolean
  maxAge?: number
}

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const DEFAULT_HEADERS = ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-CSRF-Token']

/**
 * Global CORS middleware for the Gravito HTTP adapter.
 *
 * Register via `core.adapter.useGlobal(createCorsMiddleware(options))` in bootstrap.
 *
 * Handles:
 * - OPTIONS preflight: returns 204 with CORS headers directly.
 * - All other requests: appends CORS headers to the response after next().
 *
 * @example
 * ```ts
 * core.adapter.useGlobal(
 *   createCorsMiddleware({
 *     allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? [],
 *   })
 * )
 * ```
 */
export function createCorsMiddleware(options: CorsOptions): GravitoMiddleware {
  const allowedMethods = (options.allowedMethods ?? DEFAULT_METHODS).join(', ')
  const allowedHeaders = (options.allowedHeaders ?? DEFAULT_HEADERS).join(', ')
  const maxAge = String(options.maxAge ?? 86_400)

  function isOriginAllowed(origin: string): boolean {
    if (!origin) return false
    if (options.allowedOrigins === '*') return true
    return options.allowedOrigins.includes(origin)
  }

  function applyOriginHeaders(ctx: { header: (name: string, value: string) => void }, origin: string): void {
    ctx.header('Access-Control-Allow-Origin', origin)
    ctx.header('Vary', 'Origin')
    if (options.allowCredentials) {
      ctx.header('Access-Control-Allow-Credentials', 'true')
    }
    if (options.exposeHeaders?.length) {
      ctx.header('Access-Control-Expose-Headers', options.exposeHeaders.join(', '))
    }
  }

  return async (ctx, next) => {
    const origin = ctx.req.header('origin') ?? ''
    const allowed = isOriginAllowed(origin)

    // Preflight — respond immediately, no need to run inner handlers.
    if (ctx.req.method.toUpperCase() === 'OPTIONS') {
      if (allowed) {
        ctx.header('Access-Control-Allow-Origin', origin)
        ctx.header('Access-Control-Allow-Methods', allowedMethods)
        ctx.header('Access-Control-Allow-Headers', allowedHeaders)
        ctx.header('Access-Control-Max-Age', maxAge)
        ctx.header('Vary', 'Origin')
        if (options.allowCredentials) {
          ctx.header('Access-Control-Allow-Credentials', 'true')
        }
      }
      return new Response(null, { status: 204 })
    }

    // For actual requests: run the chain, then annotate the response.
    await next()

    if (allowed && ctx.res) {
      const headers = new Headers(ctx.res.headers)
      applyOriginHeaders({ header: (n, v) => headers.set(n, v) }, origin)
      ctx.res = new Response(ctx.res.body, {
        status: ctx.res.status,
        statusText: ctx.res.statusText,
        headers,
      })
    }
    return
  }
}

/**
 * Parse `CORS_ALLOWED_ORIGINS` environment variable into an origin list.
 * Returns empty array (CORS disabled) when the variable is unset or blank.
 */
export function parseCorsAllowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}
