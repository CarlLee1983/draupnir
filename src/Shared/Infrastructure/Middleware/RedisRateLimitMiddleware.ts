import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { RateLimitConfig } from './InMemoryRateLimitMiddleware'

const RATE_LIMITED_BODY = JSON.stringify({
  success: false,
  message: 'Too many requests',
  error: 'RATE_LIMITED',
})

/**
 * Redis-backed rate limit middleware factory（多 instance 部署）。
 *
 * 使用固定窗口演算法：
 *   key = `rate:{scope}:{ip}:{windowIndex}`
 *   windowIndex = Math.floor(Date.now() / windowMs)
 *
 * Redis 故障時 fail-open：放行請求，保持服務可用。
 *
 * @param redis - IRedisService 實例（需支援 incr）
 * @param config - RateLimitConfig（scope、max、windowMs）
 */
export function createRedisRateLimit(redis: IRedisService, config: RateLimitConfig): Middleware {
  const ttlSeconds = Math.ceil(config.windowMs / 1000)

  return async (ctx, next) => {
    const rawIp = ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const ip = rawIp.split(',')[0].trim()
    const windowIndex = Math.floor(Date.now() / config.windowMs)
    const key = `rate:${config.scope}:${ip}:${windowIndex}`

    try {
      const count = await redis.incr(key, ttlSeconds)
      if (count > config.max) {
        const resetAt = (windowIndex + 1) * config.windowMs
        return new Response(RATE_LIMITED_BODY, {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        })
      }
    } catch {
      // Redis 故障：fail-open，放行請求
    }

    return next()
  }
}
