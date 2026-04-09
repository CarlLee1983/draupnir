/**
 * LogoutUserService
 * 登出服務
 *
 * 責任：
 * - Token 加入黑名單
 * - 清除用戶會話
 */

import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface LogoutRequest {
  token: string
}

export interface LogoutResponse {
  success: boolean
  message: string
  error?: string
}

export class LogoutUserService {
  constructor(private authTokenRepository: IAuthTokenRepository) {}

  /**
   * 執行登出
   */
  async execute(request: LogoutRequest): Promise<LogoutResponse> {
    try {
      // 1. 驗證 Token 不為空
      if (!request.token || request.token.trim() === '') {
        return {
          success: false,
          message: 'Token 不能為空',
          error: 'INVALID_TOKEN',
        }
      }

      // 2. 計算 Token Hash
      const tokenHash = await this.hashToken(request.token)

      // 3. 檢查 Token 是否存在
      const tokenRecord = await this.authTokenRepository.findByHash(tokenHash)
      if (!tokenRecord) {
        // 即使 Token 不存在也返回成功（冪等性）
        return {
          success: true,
          message: '登出成功',
        }
      }

      // 4. 撤銷 Token
      await this.authTokenRepository.revoke(tokenHash)

      return {
        success: true,
        message: '登出成功',
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '登出失敗',
        error: error.message,
      }
    }
  }

  /**
   * 登出所有設備（撤銷用戶的所有 Token）
   */
  async logoutAllDevices(userId: string): Promise<LogoutResponse> {
    try {
      await this.authTokenRepository.revokeAllByUserId(userId)

      return {
        success: true,
        message: '已登出所有設備',
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '登出失敗',
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
