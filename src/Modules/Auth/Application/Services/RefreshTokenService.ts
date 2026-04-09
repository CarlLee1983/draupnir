/**
 * RefreshTokenService
 * Refresh Token 刷新服務
 *
 * 責任：
 * - 驗證 Refresh Token
 * - 簽發新的 Access Token
 * - 可選地簽發新的 Refresh Token
 */

import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import { JwtTokenService, type TokenSignPayload } from './JwtTokenService'
import { Email } from '../../Domain/ValueObjects/Email'

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  success: boolean
  message: string
  error?: string
  data?: {
    accessToken: string
    refreshToken?: string
    expiresIn: number
  }
}

export class RefreshTokenService {
  constructor(
    private authRepository: IAuthRepository,
    private authTokenRepository: IAuthTokenRepository,
    private jwtService: JwtTokenService = new JwtTokenService()
  ) {}

  /**
   * 執行 Token 刷新
   */
  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      // 1. 驗證 Refresh Token
      const payload = this.jwtService.verify(request.refreshToken)
      if (!payload || payload.type !== 'refresh') {
        return {
          success: false,
          message: '無效的 Refresh Token',
          error: 'INVALID_REFRESH_TOKEN',
        }
      }

      // 2. 檢查 Token 是否被撤銷
      const tokenHash = await this.hashToken(request.refreshToken)
      const isRevoked = await this.authTokenRepository.isRevoked(tokenHash)
      if (isRevoked) {
        return {
          success: false,
          message: 'Refresh Token 已被撤銷',
          error: 'TOKEN_REVOKED',
        }
      }

      // 3. 查詢用戶
      const email = new Email(payload.email)
      const user = await this.authRepository.findByEmail(email)
      if (!user) {
        return {
          success: false,
          message: '找不到用戶',
          error: 'USER_NOT_FOUND',
        }
      }

      // 4. 簽發新 Access Token
      const tokenPayload: TokenSignPayload = {
        userId: user.id,
        email: user.emailValue,
        role: user.role.getValue(),
        permissions: [],
      }

      const newAccessToken = this.jwtService.signAccessToken(tokenPayload)
      const timeToExpire = newAccessToken.getExpiresAt().getTime() - Date.now()

      // 保存新的 Access Token 到倉庫
      const newAccessTokenStr = newAccessToken.getValue()
      const newAccessTokenHash = await this.hashToken(newAccessTokenStr)
      await this.authTokenRepository.save({
        id: `${user.id}_access_refresh_${Date.now()}`,
        userId: user.id,
        tokenHash: newAccessTokenHash,
        type: 'access',
        expiresAt: newAccessToken.getExpiresAt(),
        createdAt: new Date(),
      })

      return {
        success: true,
        message: 'Token 已刷新',
        data: {
          accessToken: newAccessTokenStr,
          expiresIn: Math.floor(timeToExpire / 1000),
        },
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Token 刷新失敗',
        error: error.message,
      }
    }
  }

  /**
   * 計算 Token Hash
   */
  private async hashToken(token: string): Promise<string> {
    return sha256(token)
  }
}
