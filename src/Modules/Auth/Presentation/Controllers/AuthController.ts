/**
 * AuthController
 * 認證模組的控制器
 *
 * 責任：
 * - 解析 HTTP 請求
 * - 調用應用層服務
 * - 返回 HTTP 回應
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { RegisterUserService } from '../../Application/Services/RegisterUserService'
import type { LoginUserService } from '../../Application/Services/LoginUserService'
import type { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import type { LogoutUserService } from '../../Application/Services/LogoutUserService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { LoginParams, RegisterParams, RefreshTokenParams } from '../Requests'

export class AuthController {
  constructor(
    private registerUserService: RegisterUserService,
    private loginUserService: LoginUserService,
    private refreshTokenService: RefreshTokenService,
    private logoutUserService: LogoutUserService
  ) {}

  /**
   * 註冊用戶端點
   * POST /api/auth/register
   */
  async register(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as RegisterParams
    const result = await this.registerUserService.execute(body)
    return ctx.json(result, result.success ? 201 : 400)
  }

  /**
   * 登入用戶端點
   * POST /api/auth/login
   */
  async login(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as LoginParams
    const result = await this.loginUserService.execute(body)
    if (!result.success) return ctx.json(result, 401)
    return ctx.json(result)
  }

  /**
   * 刷新 Token 端點
   * POST /api/auth/refresh
   */
  async refresh(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as RefreshTokenParams
    const result = await this.refreshTokenService.execute(body)
    if (!result.success) return ctx.json(result, 401)
    return ctx.json(result)
  }

  /**
   * 登出用戶端點
   * POST /api/auth/logout
   * 需要 Authorization: Bearer <token>
   */
  async logout(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.isAuthenticated(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }

    const authHeader = ctx.getHeader('authorization') ?? ctx.getHeader('Authorization')
    if (!authHeader) {
      return ctx.json({ success: false, message: '缺少 Token', error: 'MISSING_TOKEN' }, 400)
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return ctx.json({ success: false, message: '無效的 Authorization 格式', error: 'INVALID_AUTH_HEADER' }, 400)
    }
    const token = parts[1]

    const result = await this.logoutUserService.execute({ token })
    return ctx.json(result, result.success ? 200 : 400)
  }
}
