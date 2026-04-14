import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * 可設定的 auth rate limit middleware factory。
 *
 * @param windowMs - 時間窗口（毫秒）
 * @param maxRequests - 窗口內最大請求數
 */
export function createAuthRateLimit(windowMs: number, maxRequests: number): Middleware {
  const counts = new Map<string, { count: number; resetAt: number }>()

  return async (ctx, next) => {
    const ip =
      ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const now = Date.now()
    const entry = counts.get(ip)

    if (!entry || now > entry.resetAt) {
      counts.set(ip, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (entry.count >= maxRequests) {
      return new Response(
        JSON.stringify({ success: false, message: 'Too many requests', error: 'RATE_LIMITED' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          },
        },
      )
    }

    entry.count++
    return next()
  }
}

/** 登入頁：10 分鐘內最多 10 次 */
export const loginRateLimit: Middleware = createAuthRateLimit(10 * 60 * 1000, 10)

/** 忘記密碼頁：1 小時內最多 5 次 */
export const forgotPasswordRateLimit: Middleware = createAuthRateLimit(60 * 60 * 1000, 5)
