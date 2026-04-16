import { type AuthContext, AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/** Result of {@link requireManager}. */
export interface ManagerAuthResult {
  ok: boolean
  auth?: AuthContext
  response?: Response
}

/**
 * 要求呼叫者 role = 'manager'。
 *
 * - 未登入：redirect `/login`
 * - admin：redirect `/admin/dashboard`
 * - member 或其他：redirect `/member/dashboard`
 * - manager：`{ ok: true, auth }`，由 page handler 自行確認 `organization_id`
 *   （見 spec §2「manager 但無有效 org」的異常狀態處理）。
 *
 * 注意：本 middleware 不驗證 `organization_id`。若同一條 middleware 覆蓋 GET 與 POST，
 * 一旦 middleware 直接 redirect 會破壞 Inertia 的 POST 導航（應該 303 回同頁）。
 * org missing 的判斷與 redirect 交由各 page handler 的 GET 入口處理。
 */
export function requireManager(ctx: IHttpContext): ManagerAuthResult {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (!auth) {
    return { ok: false, response: ctx.redirect('/login') }
  }
  if (auth.role === 'admin') {
    return { ok: false, response: ctx.redirect('/admin/dashboard') }
  }
  if (auth.role !== 'manager') {
    return { ok: false, response: ctx.redirect('/member/dashboard') }
  }
  return { ok: true, auth }
}
