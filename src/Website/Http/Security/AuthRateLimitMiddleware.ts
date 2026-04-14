import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

interface RateLimitEntry {
  count: number
  resetAt: number
}

function getClientIp(ctx: Parameters<Middleware>[0]): string {
  const forwarded = ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('X-Forwarded-For') ?? ''
  const firstIp = forwarded.split(',')[0]?.trim()
  if (firstIp) return firstIp
  return ctx.getHeader('x-real-ip') ?? ctx.getHeader('X-Real-IP') ?? 'unknown'
}

/**
 * In-memory sliding-window rate limiter for auth endpoints.
 *
 * @param maxRequests - Maximum allowed requests in the window.
 * @param windowMs    - Window size in milliseconds.
 *
 * @example
 * ```ts
 * // Allow 10 login attempts per 15 minutes per IP
 * const loginRateLimit = createAuthRateLimit(10, 15 * 60 * 1000)
 * router.post('/login', [loginRateLimit], LoginRequest, handler)
 * ```
 */
export function createAuthRateLimit(maxRequests: number, windowMs: number): Middleware {
  const store = new Map<string, RateLimitEntry>()

  // Evict expired entries to prevent unbounded growth.
  // Runs probabilistically (1-in-100 requests) to avoid per-request overhead.
  function maybeEvict(): void {
    if (Math.random() > 0.01) return
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }

  return async (ctx, next) => {
    const ip = getClientIp(ctx)
    const now = Date.now()

    maybeEvict()

    const entry = store.get(ip)
    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
      return next()
    }

    entry.count++
    if (entry.count > maxRequests) {
      const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000)
      return new Response(
        JSON.stringify({ success: false, message: 'Too many requests', error: 'RATE_LIMIT_EXCEEDED' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSecs),
          },
        },
      )
    }

    return next()
  }
}

/** 10 attempts per 15 minutes — for `/login` and `/register`. */
export const loginRateLimit = createAuthRateLimit(10, 15 * 60 * 1000)

/** 5 attempts per 60 minutes — for `/forgot-password`. */
export const forgotPasswordRateLimit = createAuthRateLimit(5, 60 * 60 * 1000)
