import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

export interface RateLimitConfig {
  /** key 前綴或計數器標籤，用於隔離不同端點的計數 */
  scope: string
  /** 窗口內最大請求數 */
  max: number
  /** 窗口大小（毫秒） */
  windowMs: number
}

const RATE_LIMITED_BODY = JSON.stringify({
  success: false,
  message: 'Too many requests',
  error: 'RATE_LIMITED',
})

/**
 * In-memory rate limit middleware factory（單機部署）。
 *
 * 使用 Map 追蹤每個 IP 在固定窗口內的請求計數。
 * 每個 createInMemoryRateLimit 呼叫建立獨立的計數器，不同端點互不干擾。
 */
export function createInMemoryRateLimit(config: RateLimitConfig): Middleware {
  const counts = new Map<string, { count: number; resetAt: number }>()

  return async (ctx, next) => {
    const ip =
      ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const key = `${config.scope}:${ip}`
    const now = Date.now()
    const entry = counts.get(key)

    if (!entry || now > entry.resetAt) {
      counts.set(key, { count: 1, resetAt: now + config.windowMs })
      return next()
    }

    if (entry.count >= config.max) {
      return new Response(RATE_LIMITED_BODY, {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      })
    }

    entry.count++
    return next()
  }
}
