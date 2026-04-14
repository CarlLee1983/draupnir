import type { PendingCookie } from '@/Shared/Presentation/IHttpContext'
import { applyPendingCookies } from '@/Shared/Presentation/cookieUtils'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import {
  createCorsMiddleware,
  parseCorsAllowedOrigins,
} from '@/Shared/Infrastructure/Middleware/CorsGlobalMiddleware'
import { createSecurityHeadersMiddleware } from '@/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware'
import { attachJwt } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { requireAdmin } from '@/Website/Admin/middleware/requireAdmin'
import { requireMember } from '@/Website/Member/middleware/requireMember'
import { attachWebCsrf } from './Security/CsrfMiddleware'
import { injectSharedData } from './Inertia/SharedPropsBuilder'

// ─── 內部 middleware 包裝 ──────────────────────────────────────────────────────

function injectSharedDataMiddleware(): Middleware {
  return async (ctx, next) => {
    injectSharedData(ctx)
    return next()
  }
}

function requireAdminMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireAdmin(ctx)
    return r.ok ? next() : r.response!
  }
}

function requireMemberMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireMember(ctx)
    return r.ok ? next() : r.response!
  }
}

function pendingCookiesMiddleware(): Middleware {
  return async (ctx, next) => {
    const response = await next()
    const pending = ctx.get<PendingCookie[]>('__pending_cookies__') ?? []
    return applyPendingCookies(response, pending)
  }
}

// ─── HttpKernel ────────────────────────────────────────────────────────────────

/** 所有 page group 共用的基底 middleware 鏈 */
const webBase = (): Middleware[] => [
  attachJwt(),
  attachWebCsrf(),
  injectSharedDataMiddleware(),
]

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
   * 掛載順序：SecurityHeaders → CORS（有設定時）
   */
  global: (): Middleware[] => {
    const corsOrigins = parseCorsAllowedOrigins()
    return [
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
    /** 公開頁面（login、register 等），無 role check */
    web: (): Middleware[] => [...webBase(), pendingCookiesMiddleware()],
    /** Admin 區域：web 基底 + admin role 驗證 */
    admin: (): Middleware[] => [...webBase(), requireAdminMiddleware(), pendingCookiesMiddleware()],
    /** Member 區域：web 基底 + 登入驗證 */
    member: (): Middleware[] => [
      ...webBase(),
      requireMemberMiddleware(),
      pendingCookiesMiddleware(),
    ],
  },
} as const
