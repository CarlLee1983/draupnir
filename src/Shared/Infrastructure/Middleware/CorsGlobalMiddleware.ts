import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

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
 * Global CORS middleware.
 *
 * Register via HttpKernel.global() → GravitoKernelAdapter.registerGlobalMiddlewares().
 *
 * - OPTIONS preflight: returns 204 with CORS headers (does not call next).
 * - All other requests: calls next(), then appends CORS headers to the response.
 */
export function createCorsMiddleware(options: CorsOptions): Middleware {
  const allowedMethods = (options.allowedMethods ?? DEFAULT_METHODS).join(', ')
  const allowedHeaders = (options.allowedHeaders ?? DEFAULT_HEADERS).join(', ')
  const maxAge = String(options.maxAge ?? 86_400)

  function isOriginAllowed(origin: string): boolean {
    if (!origin) return false
    if (options.allowedOrigins === '*') return true
    return options.allowedOrigins.includes(origin)
  }

  return async (ctx, next) => {
    const origin = ctx.getHeader('origin') ?? ''
    const allowed = isOriginAllowed(origin)

    if (ctx.getMethod() === 'OPTIONS') {
      const headers = new Headers()
      if (allowed) {
        headers.set('Access-Control-Allow-Origin', origin)
        headers.set('Access-Control-Allow-Methods', allowedMethods)
        headers.set('Access-Control-Allow-Headers', allowedHeaders)
        headers.set('Access-Control-Max-Age', maxAge)
        headers.set('Vary', 'Origin')
        if (options.allowCredentials) {
          headers.set('Access-Control-Allow-Credentials', 'true')
        }
      }
      return new Response(null, { status: 204, headers })
    }

    const response = await next()
    if (!allowed) return response

    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
    if (options.allowCredentials) {
      headers.set('Access-Control-Allow-Credentials', 'true')
    }
    if (options.exposeHeaders?.length) {
      headers.set('Access-Control-Expose-Headers', options.exposeHeaders.join(', '))
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
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
