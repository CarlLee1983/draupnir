/**
 * Named middleware — 路由層的統一 import 入口。
 *
 * 在 registerXxxRoutes 裡從這裡 import，不直接引用各 Security/ 路徑。
 *
 * ## 擴充方式
 * 新增 route-level middleware 時，在這裡加一行 export。
 */

// Organization access control（用於需要 org manager 權限的路由）
export {
  requireOrganizationContext,
  requireOrganizationManager,
} from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
export type { RateLimitConfig } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'
// Rate limiting — in-memory（單機部署，Map 計數）
export { createInMemoryRateLimit } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'
// Rate limiting — Redis（多 instance 部署，原子計數）
export { createRedisRateLimit } from '@/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware'

import { createBodySizeLimitMiddleware } from '@/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware'

/**
 * Body size limit middleware factory (used for routes that need to override default limits).
 *
 * @param maxBytes - Maximum allowed body size in bytes.
 * @returns Middleware that enforces the body size limit.
 */
export const bodyLimit = (maxBytes: number) => createBodySizeLimitMiddleware(maxBytes)
