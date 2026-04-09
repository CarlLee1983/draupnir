/**
 * AuthMiddleware
 * Token 驗證中間件
 *
 * 責任：
 * - 從 Header 提取 Token（Bearer 方案）
 * - 驗證 Token
 * - 注入用戶上下文到 HttpContext
 * - 允許未驗證的請求通過（401 響應由 Controller 決定）
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { JwtTokenService } from '@/Modules/Auth/Application/Services/JwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { createHash } from 'crypto'

export interface AuthContext {
  userId: string
  email: string
  role: string
  permissions: string[]
  tokenType: string
}

export class AuthMiddleware {
  private jwtService: JwtTokenService

  constructor(private authTokenRepository?: IAuthTokenRepository) {
    this.jwtService = new JwtTokenService()
  }

  /**
   * 處理請求
   */
  async handle(ctx: IHttpContext): Promise<void> {
    try {
      // 1. 從 Header 提取 Token
      const token = this.extractToken(ctx)
      if (!token) {
        // 沒有 Token，繼續處理（可能是公開端點）
        return
      }

      // 2. 驗證 Token
      const payload = this.jwtService.verify(token)
      if (!payload) {
        // 無效的 Token，設置錯誤信息但不中斷
        ctx.set('authError', 'INVALID_TOKEN')
        return
      }

      // 3. 檢查 Token 是否被撤銷（如果提供了 Repository）
      if (this.authTokenRepository) {
        const tokenHash = this.hashToken(token)
        const isRevoked = await this.authTokenRepository.isRevoked(tokenHash)
        if (isRevoked) {
          ctx.set('authError', 'TOKEN_REVOKED')
          return
        }
      }

      // 4. 注入用戶上下文到 HttpContext
      const authContext: AuthContext = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        tokenType: payload.type,
      }

      ctx.set('auth', authContext)
      ctx.set('user', {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      })
    } catch (error: any) {
      // 中間件不應拋出異常，只設置狀態
      ctx.set('authError', error.message)
    }
  }

  /**
   * 從 Header 提取 Token
   * 期望格式：Authorization: Bearer <token>
   */
  private extractToken(ctx: IHttpContext): string | null {
    const header =
      ctx.getHeader('authorization') ??
      ctx.getHeader('Authorization') ??
      ctx.headers?.authorization ??
      ctx.headers?.Authorization
    if (!header) {
      return null
    }

    const parts = header.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null
    }

    return parts[1]
  }

  /**
   * 檢查用戶是否已認證
   */
  static isAuthenticated(ctx: IHttpContext): boolean {
    return !!ctx.get<AuthContext>('auth')
  }

  /**
   * 取得認證上下文
   */
  static getAuthContext(ctx: IHttpContext): AuthContext | null {
    return ctx.get<AuthContext>('auth') || null
  }

  /**
   * 取得認證錯誤
   */
  static getAuthError(ctx: IHttpContext): string | null {
    return ctx.get<string>('authError') || null
  }

  /**
   * 計算 Token Hash
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
