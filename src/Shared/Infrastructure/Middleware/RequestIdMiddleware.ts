import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * Middleware that assigns a unique ID to every request.
 *
 * Priority:
 * 1. Upstream `x-request-id` header (e.g. from Cloudflare / load balancer)
 * 2. Newly generated `crypto.randomUUID()`
 *
 * Stores the ID in ctx under key `'requestId'` and appends `x-request-id`
 * to the response headers.
 */
export function createRequestIdMiddleware(): Middleware {
  return async (ctx, next) => {
    const id = ctx.getHeader('x-request-id') ?? crypto.randomUUID()
    ctx.set('requestId', id)

    const response = await next()
    const headers = new Headers(response.headers)
    headers.set('x-request-id', id)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
