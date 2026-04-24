import { attachJwt } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { requireOrganizationContext } from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import { createBodySizeLimitMiddleware } from '@/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware'
import {
  createCorsMiddleware,
  parseCorsAllowedOrigins,
} from '@/Shared/Infrastructure/Middleware/CorsGlobalMiddleware'
import { createGlobalErrorMiddleware } from '@/Shared/Infrastructure/Middleware/GlobalErrorMiddleware'
import { createInertiaFormValidationResponseMiddleware } from '@/Shared/Infrastructure/Middleware/InertiaFormValidationResponseMiddleware'
import { createOrganizationMemberLookupCacheMiddleware } from '@/Shared/Infrastructure/Middleware/OrganizationMemberLookupCacheMiddleware'
import { createRequestIdMiddleware } from '@/Shared/Infrastructure/Middleware/RequestIdMiddleware'
import { createRequestLoggerMiddleware } from '@/Shared/Infrastructure/Middleware/RequestLoggerMiddleware'
import { createSecurityHeadersMiddleware } from '@/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware'
import { applyPendingCookies } from '@/Shared/Presentation/cookieUtils'
import type { PendingCookie } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { requireAdmin } from '@/Website/Admin/middleware/requireAdmin'
import { requireManager } from '@/Website/Manager/middleware/requireManager'
import { requireMember } from '@/Website/Member/middleware/requireMember'
import { injectSharedData } from './Inertia/SharedPropsBuilder'
import { createTokenRefreshMiddleware } from './Middleware/TokenRefreshMiddleware'
import { attachWebCsrf } from './Security/CsrfMiddleware'

// ─── 內部 middleware 包裝 ──────────────────────────────────────────────────────

/**
 * Injects Inertia shared data (auth, flash, etc.) into the context.
 */
function injectSharedDataMiddleware(): Middleware {
  return async (ctx, next) => {
    injectSharedData(ctx)
    return next()
  }
}

/**
 * Middleware that requires the user to have the 'admin' role.
 */
function requireAdminMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireAdmin(ctx)
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    return r.ok ? next() : r.response!
  }
}

/**
 * Middleware that requires the user to have a 'member' role (any valid login).
 */
function requireMemberMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireMember(ctx)
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    return r.ok ? next() : r.response!
  }
}

/**
 * Middleware that requires the user to have the 'manager' role.
 */
function requireManagerMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireManager(ctx)
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    return r.ok ? next() : r.response!
  }
}

/**
 * Middleware that applies pending cookies to the final Response.
 */
export function pendingCookiesMiddleware(): Middleware {
  return async (ctx, next) => {
    const response = await next()
    const pending = ctx.get<PendingCookie[]>('__pending_cookies__') ?? []
    return applyPendingCookies(response, pending)
  }
}

// ─── HttpKernel ────────────────────────────────────────────────────────────────

/** 所有 page group 共用的基底 middleware 鏈 */
const webBase = (): Middleware[] => [attachJwt(), createTokenRefreshMiddleware(), attachWebCsrf()]

/**
 * 集中式 middleware 定義。
 *
 * 全檔案只使用 `Middleware = (ctx, next) => Promise<Response>` 型別。
 * Gravito 型別轉換在 GravitoKernelAdapter.ts 處理。
 *
 * ## 擴充指南
 * - 新 global middleware（如 Session）→ `global()` 陣列加一行
 * - 所有 page 都要跑的 middleware → `webBase()` 陣列加一行
 * - 特定 page group 的 middleware → 對應 `groups.*()` 加一行
 * - 全新 page group → `groups` 加新 key
 */
export const HttpKernel = {
  /**
   * 層一：Global middleware — 每個請求都經過。
   * 掛載順序：BodySizeLimit → GlobalError → RequestId → OrgMemberLookupCache → RequestLogger → SecurityHeaders → CORS（有設定時）
   *
   * BodySizeLimit 必須排第一：413 拒絕不需要進入 error wrapper，
   * 且避免讀取超大 body 對後續 middleware 造成記憶體壓力。
   *
   * @returns Array of global middleware.
   */
  global: (): Middleware[] => {
    const corsOrigins = parseCorsAllowedOrigins()
    return [
      createBodySizeLimitMiddleware(512 * 1024),
      createGlobalErrorMiddleware(),
      createRequestIdMiddleware(),
      createOrganizationMemberLookupCacheMiddleware(),
      createRequestLoggerMiddleware(),
      createSecurityHeadersMiddleware(),
      ...(corsOrigins.length > 0
        ? [createCorsMiddleware({ allowedOrigins: corsOrigins, allowCredentials: true })]
        : []),
    ]
  },

  /**
   * 層二：Page middleware groups — 依 Inertia 存取區域套用。
   */
  groups: {
    /**
     * 公開頁面（login、register 等），無 role check。
     *
     * @returns Array of web middleware.
     */
    web: (): Middleware[] => [
      ...webBase(),
      injectSharedDataMiddleware(),
      pendingCookiesMiddleware(),
      createInertiaFormValidationResponseMiddleware(),
    ],
    /**
     * Admin 區域：web 基底 + admin role 驗證。
     *
     * @returns Array of admin middleware.
     */
    admin: (): Middleware[] => [
      ...webBase(),
      requireAdminMiddleware(),
      injectSharedDataMiddleware(),
      pendingCookiesMiddleware(),
      createInertiaFormValidationResponseMiddleware(),
    ],
    /**
     * Manager 區域：web 基底 + manager role 驗證。
     *
     * @returns Array of manager middleware.
     */
    manager: (): Middleware[] => [
      ...webBase(),
      requireManagerMiddleware(),
      requireOrganizationContext(),
      injectSharedDataMiddleware(),
      pendingCookiesMiddleware(),
      createInertiaFormValidationResponseMiddleware(),
    ],
    /**
     * Member 區域：web 基底 + 登入驗證。
     *
     * @returns Array of member middleware.
     */
    member: (): Middleware[] => [
      ...webBase(),
      requireMemberMiddleware(),
      injectSharedDataMiddleware(),
      pendingCookiesMiddleware(),
      createInertiaFormValidationResponseMiddleware(),
    ],
  },
} as const
