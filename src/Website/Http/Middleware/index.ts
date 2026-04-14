/**
 * Named middleware — 路由層的統一 import 入口。
 *
 * 在 registerXxxRoutes 裡從這裡 import，不直接引用各 Security/ 路徑。
 *
 * ## 擴充方式
 * 新增 route-level middleware 時，在這裡加一行 export。
 */

// Auth rate limiting（用於 /login、/register、/forgot-password 路由）
export {
  createAuthRateLimit,
  forgotPasswordRateLimit,
  loginRateLimit,
} from '../Security/AuthRateLimitMiddleware'

// Organization access control（用於需要 org manager 權限的路由）
export {
  requireOrganizationContext,
  requireOrganizationManager,
} from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'

// Body size limit（用於需要覆寫預設大小的路由，例如未來的檔案上傳）
export { createBodySizeLimitMiddleware } from '@/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware'

export const bodyLimit = (maxBytes: number) => createBodySizeLimitMiddleware(maxBytes)
