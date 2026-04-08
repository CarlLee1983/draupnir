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
import type { RegisterUserRequest } from '../../Application/DTOs/RegisterUserDTO'
import type { LoginRequest } from '../../Application/DTOs/LoginDTO'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

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
  async register(ctx: IHttpContext): Promise<any> {
    try {
      const body = await ctx.getJsonBody() as RegisterUserRequest

      // 調用應用層服務
      const result = await this.registerUserService.execute(body)

      // 返回回應
      return ctx.json(result, result.success ? 201 : 400)
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          message: '註冊失敗',
          error: error.message,
        },
        400
      )
    }
  }

  /**
   * 登入用戶端點
   * POST /api/auth/login
   */
  async login(ctx: IHttpContext): Promise<any> {
    try {
      const body = await ctx.getJsonBody() as LoginRequest

      // 調用應用層服務
      const result = await this.loginUserService.execute(body)

      // 返回回應
      return ctx.json(result, result.success ? 200 : 401)
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          message: '登入失敗',
          error: error.message,
        },
        400
      )
    }
  }

  /**
   * 刷新 Token 端點
   * POST /api/auth/refresh
   */
  async refresh(ctx: IHttpContext): Promise<any> {
    try {
      const body = await ctx.getJsonBody() as { refreshToken: string }

      // 調用應用層服務
      const result = await this.refreshTokenService.execute(body)

      // 返回回應
      return ctx.json(result, result.success ? 200 : 401)
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          message: 'Token 刷新失敗',
          error: error.message,
        },
        400
      )
    }
  }

  /**
   * 登出用戶端點
   * POST /api/auth/logout
   * 需要 Authorization: Bearer <token>
   */
  async logout(ctx: IHttpContext): Promise<any> {
    try {
      // 檢查認證
      if (!AuthMiddleware.isAuthenticated(ctx)) {
        return ctx.json(
          {
            success: false,
            message: '未經授權',
            error: 'UNAUTHORIZED',
          },
          401
        )
      }

      // 從 Header 提取 Token
      const authHeader = ctx.headers?.authorization || ctx.headers?.Authorization
      if (!authHeader) {
        return ctx.json(
          {
            success: false,
            message: '缺少 Token',
            error: 'MISSING_TOKEN',
          },
          400
        )
      }

      const token = authHeader.replace('Bearer ', '')

      // 調用應用層服務
      const result = await this.logoutUserService.execute({ token })

      // 返回回應
      return ctx.json(result, result.success ? 200 : 400)
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          message: '登出失敗',
          error: error.message,
        },
        400
      )
    }
  }
}
