# Redis Rate Limiting 設計文件

**日期：** 2026-04-15
**狀態：** 已核准，待實作
**範疇：** 生產就緒 — 多 instance 部署、rate limiting 基礎設施

---

## 背景與目標

現有 `AuthRateLimitMiddleware` 使用 in-memory Map，在多 instance 部署下每個 instance 各自計數，等同於限速失效。

目標：
1. 提供 Redis 持久化版本（多 instance 共用計數）
2. 保留 in-memory 版本（單機或不需 Redis 的情境）
3. 兩者 API 對稱，使用方式一致
4. 移除有語意限制的預建實例，改由路由層 inline 設定

---

## 設計決策

| 決策 | 理由 |
|------|------|
| in-memory 保留 | 單機部署或開發環境無需 Redis |
| 移除 `loginRateLimit`、`forgotPasswordRateLimit` 預建實例 | 名稱語意限制，無法用於其他路由 |
| 統一 `RateLimitConfig` 型別 | 兩個版本共用，方便切換 |
| Redis fail-open | Redis 故障時放行，服務可用性優先 |
| 固定窗口演算法 | 簡單、可預測，夠用於大多數場景 |
| 檔案移至 `Shared/Infrastructure/Middleware/` | 不限 Website 層使用，API 層也可用 |
| `HttpKernel.ts` 不改 | 不強制全域限速，各層自行決定是否套用 |

---

## 架構概覽

```
Request
  └── [Named] createInMemoryRateLimit(config)   ← 單機，使用 in-memory Map
  └── [Named] createRedisRateLimit(redis, config) ← 多 instance，使用 Redis INCR
```

兩個工廠並存，路由層選用：

```ts
// 單機部署
router.post('/login', [
  createInMemoryRateLimit({ scope: 'login', max: 10, windowMs: 600_000 })
], handler)

// 多 instance 部署
const redis = container.make('redis') as IRedisService
router.post('/login', [
  createRedisRateLimit(redis, { scope: 'login', max: 10, windowMs: 600_000 })
], handler)
```

---

## 共用型別

```ts
interface RateLimitConfig {
  scope: string    // key 前綴或計數器標籤，用於隔離不同端點的計數
  max: number      // 窗口內最大請求數
  windowMs: number // 窗口大小（毫秒）
}
```

---

## 429 回應格式（對齊現有）

```json
{
  "success": false,
  "message": "Too many requests",
  "error": "RATE_LIMITED"
}
```

附 header：`Retry-After: <seconds>`

---

## Redis 演算法：固定窗口（Fixed Window）

```
windowIndex = Math.floor(Date.now() / windowMs)
key         = `rate:{scope}:{ip}:{windowIndex}`
count       = redis.incr(key, ttlSeconds)   // 原子遞增 + 設定 TTL
if count > max → 429
Redis 拋錯   → catch → next()（fail-open）
```

`incr(key, ttlSeconds)` 需擴充 `IRedisService`（見下方）。

---

## 新增 / 修改檔案

### 新增：`src/Shared/Infrastructure/IRedisService.ts`（修改）

新增方法：

```ts
/**
 * 原子遞增 key 的值，若 key 不存在則設為 1，同時設定 TTL。
 * 回傳遞增後的值。
 *
 * @param key - Redis key
 * @param ttlSeconds - key 的存活時間（秒）
 */
incr(key: string, ttlSeconds: number): Promise<number>
```

### 修改：`src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts`

實作 `incr`：

```ts
async incr(key: string, ttlSeconds: number): Promise<number> {
  const count = await this.redis.incr(key)
  if (count === 1) {
    await this.redis.expire(key, ttlSeconds)
  }
  return count
}
```

注意：`incr` 回傳 1 代表 key 剛建立，此時設定 TTL。後續遞增不重設 TTL（固定窗口語意）。

### 刪除：`src/Website/Http/Security/AuthRateLimitMiddleware.ts`

移至 Shared 層並重新命名，舊檔案刪除。

### 新增：`src/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware.ts`

```ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

export interface RateLimitConfig {
  scope: string
  max: number
  windowMs: number
}

export function createInMemoryRateLimit(config: RateLimitConfig): Middleware {
  const counts = new Map<string, { count: number; resetAt: number }>()
  return async (ctx, next) => {
    const ip = ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const key = `${config.scope}:${ip}`
    const now = Date.now()
    const entry = counts.get(key)

    if (!entry || now > entry.resetAt) {
      counts.set(key, { count: 1, resetAt: now + config.windowMs })
      return next()
    }

    if (entry.count >= config.max) {
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
```

### 新增：`src/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware.ts`

```ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { RateLimitConfig } from './InMemoryRateLimitMiddleware'

const RATE_LIMITED_BODY = JSON.stringify({
  success: false,
  message: 'Too many requests',
  error: 'RATE_LIMITED',
})

export function createRedisRateLimit(redis: IRedisService, config: RateLimitConfig): Middleware {
  const ttlSeconds = Math.ceil(config.windowMs / 1000)
  return async (ctx, next) => {
    const ip = ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
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
```

### 修改：`src/Website/Http/Middleware/index.ts`

移除舊 AuthRateLimit exports，改為：

```ts
// Rate limiting（in-memory，單機部署）
export { createInMemoryRateLimit } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'
export type { RateLimitConfig } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'

// Rate limiting（Redis，多 instance 部署）
export { createRedisRateLimit } from '@/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware'
```

### 修改：`src/Website/Auth/routes/registerAuthRoutes.ts`

移除舊 import，改為 inline 設定：

```ts
import { createInMemoryRateLimit } from '@/Website/Http/Middleware'

// 使用：
middlewares: [createInMemoryRateLimit({ scope: 'auth:login', max: 10, windowMs: 10 * 60 * 1000 })]
// 忘記密碼：
middlewares: [createInMemoryRateLimit({ scope: 'auth:forgot', max: 5, windowMs: 60 * 60 * 1000 })]
```

---

## 測試覆蓋

### `__tests__/InMemoryRateLimitMiddleware.test.ts`（新）

| 情境 | 預期 |
|------|------|
| 請求數在限制內 | 200，next() 執行 |
| 請求數超過限制 | 429，附 Retry-After |
| 窗口重置後 | 計數歸零，next() 執行 |
| 不同 scope 互不干擾 | 各自計數 |
| 不同 IP 互不干擾 | 各自計數 |
| 沒有 IP header | 歸入 'unknown'，正常計數 |

### `__tests__/RedisRateLimitMiddleware.test.ts`（新）

| 情境 | 預期 |
|------|------|
| Redis 回傳計數在限制內 | 200 |
| Redis 回傳計數超過限制 | 429，附 Retry-After |
| Redis.incr 拋錯（fail-open）| 200，next() 執行 |
| 不同 scope 產生不同 key | key 格式 `rate:{scope}:{ip}:{window}` |
| 不同窗口產生不同 key | windowIndex 正確計算 |

### `__tests__/GravitoRedisAdapter.test.ts`（修改，補充 incr）

| 情境 | 預期 |
|------|------|
| incr 新 key → 回傳 1，TTL 設定 | count = 1 |
| incr 既有 key → 累加，不重設 TTL | count = 2 |

---

## 不在此次範疇

- 全域 rate limit（各層自行決定是否套用）
- Sliding window 演算法
- Rate limit 白名單
- Redis 連線管理
