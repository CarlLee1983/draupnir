import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware, type AuthContext } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export interface AdminAuthResult {
  ok: boolean
  auth?: AuthContext
  response?: Response
}

/**
 * 檢查請求是否來自已登入的 admin 使用者。
 * - 未登入：重導至 /login
 * - 非 admin：回傳 403 HTML 錯誤頁
 * - admin：回傳 { ok: true, auth }
 */
export function requireAdmin(ctx: IHttpContext): AdminAuthResult {
  const auth = AuthMiddleware.getAuthContext(ctx)

  if (!auth) {
    return { ok: false, response: ctx.redirect('/login') }
  }

  if (auth.role !== 'admin') {
    return {
      ok: false,
      response: new Response(
        '<html><body><h1>403 Forbidden</h1><p>需要管理員權限</p></body></html>',
        { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      ),
    }
  }

  return { ok: true, auth }
}
