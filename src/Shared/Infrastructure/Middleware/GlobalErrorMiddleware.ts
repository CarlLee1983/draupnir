import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * Outermost middleware that catches unhandled exceptions.
 *
 * Response format is determined by the request type:
 * - `X-Inertia` header present → Inertia-compatible JSON 500
 * - `Accept: application/json`  → JSON { success: false, error: "INTERNAL_ERROR" }
 * - Otherwise                   → plain text/html 500
 *
 * Stack traces are NEVER exposed to the client. The full error is logged
 * server-side with the requestId for tracing.
 */
export function createGlobalErrorMiddleware(): Middleware {
  return async (ctx, next) => {
    try {
      return await next()
    } catch (err) {
      // Pass through Response objects thrown intentionally
      if (err instanceof Response) return err

      const error = err instanceof Error ? err : new Error(String(err))
      const requestId = ctx.get<string>('requestId') ?? 'unknown'

      // Log full error server-side only
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId,
          msg: error.message,
          stack: error.stack,
        }),
      )

      const isInertia = Boolean(ctx.getHeader('x-inertia'))
      const acceptsJson = (ctx.getHeader('accept') ?? '').includes('application/json')

      if (isInertia) {
        return new Response(
          JSON.stringify({
            component: 'Error',
            props: { status: 500 },
            url: ctx.getPathname(),
            version: null,
            clearHistory: false,
            encryptHistory: false,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'X-Inertia': 'true',
            },
          },
        )
      }

      if (acceptsJson) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred. Please try again later.',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        '<!DOCTYPE html><html><body><h1>500 Internal Server Error</h1><p>An unexpected error occurred.</p></body></html>',
        {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      )
    }
  }
}
