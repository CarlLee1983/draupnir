/**
 * TokenRefreshMiddleware
 *
 * 若 access token 不存在或已過期，自動以 refresh_token cookie 換發新 access token。
 * 成功後更新 auth_token cookie 並注入 auth context，使後續 middleware（requireMember 等）可正常通過。
 */

import { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { isSecureRequest } from '@/Shared/Infrastructure/Http/isSecureRequest'
import type { RefreshTokenService } from '@/Modules/Auth/Application/Services/RefreshTokenService'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

let refreshService: RefreshTokenService | null = null
const jwtService = new JwtTokenService()

/**
 * 由 AuthServiceProvider.boot() 呼叫，注入 RefreshTokenService。
 */
export function configureTokenRefresh(service: RefreshTokenService): void {
  refreshService = service
}

/**
 * 建立 token 自動刷新 middleware。
 * 必須放在 attachJwt() 之後、requireMember/requireAdmin 之前。
 */
export function createTokenRefreshMiddleware(): Middleware {
  return async (ctx, next) => {
    // 已有有效 auth context，不需要刷新
    if (AuthMiddleware.isAuthenticated(ctx)) return next()

    // 尚未注入 refreshService（測試或早期啟動時），直接跳過
    if (!refreshService) return next()

    const refreshToken = ctx.getCookie('refresh_token')
    if (!refreshToken) return next()

    const result = await refreshService.execute({ refreshToken })
    if (!result.success || !result.data) return next()

    const newAccessToken = result.data.accessToken

    // 設定新的 access token cookie（15 分鐘）
    ctx.setCookie('auth_token', newAccessToken, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 900,
      secure: isSecureRequest(ctx),
    })

    // 直接解析 JWT payload 並注入 auth context（避免重跑 AuthMiddleware）
    const payload = jwtService.verify(newAccessToken)
    if (payload) {
      ctx.set('auth', {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        tokenType: payload.type,
      })
      ctx.set('user', { id: payload.userId, email: payload.email, role: payload.role })
    }

    return next()
  }
}
