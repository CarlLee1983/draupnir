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
import { RegisterUserSchema, LoginSchema, RefreshTokenSchema } from '../Validators'

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

      // Zod 驗證
      const validation = RegisterUserSchema.safeParse(body)
      if (!validation.success) {
        return ctx.json(
          {
            success: false,
            message: '驗證失敗',
            error: validation.error.issues[0].message,
          },
          400
        )
      }

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

      // Zod 驗證
      const validation = LoginSchema.safeParse(body)
      if (!validation.success) {
        return ctx.json(
          {
            success: false,
            message: '驗證失敗',
            error: validation.error.issues[0].message,
          },
          400
        )
      }

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

      const validation = RefreshTokenSchema.safeParse(body)
      if (!validation.success) {
        return ctx.json(
          {
            success: false,
            message: '驗證失敗',
            error: validation.error.issues[0].message,
          },
          400,
        )
      }

      // 調用應用層服務
      const result = await this.refreshTokenService.execute(validation.data)

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

      // 從 Header 提取 Token（與 AuthMiddleware.extractToken 使用相同邏輯）
      const authHeader =
        ctx.getHeader('authorization') ?? ctx.getHeader('Authorization') ?? undefined
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

      const parts = authHeader.split(' ')
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return ctx.json(
          {
            success: false,
            message: '無效的 Authorization 格式',
            error: 'INVALID_AUTH_HEADER',
          },
          400
        )
      }
      const token = parts[1]

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
