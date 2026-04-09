/**
 * JwtTokenService
 * JWT Token 簽發和驗證服務
 *
 * 責任：
 * - 簽發 Access Token（15 分鐘）
 * - 簽發 Refresh Token（7 天）
 * - 驗證 Token 簽名和過期時間
 * - 解析 Token 負載
 */

import jwt from 'jsonwebtoken'
import { AuthToken, TokenType, type TokenPayload } from '../../Domain/ValueObjects/AuthToken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60 // 15 分鐘
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 // 7 天

export interface TokenSignPayload {
  userId: string
  email: string
  role: string
  permissions: string[]
}

export class JwtTokenService {
  /**
   * 簽發 Access Token
   */
  signAccessToken(payload: TokenSignPayload): AuthToken {
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.ACCESS,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    return new AuthToken(token, expiresAt, TokenType.ACCESS, tokenPayload)
  }

  /**
   * 簽發 Refresh Token
   */
  signRefreshToken(payload: TokenSignPayload): AuthToken {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.REFRESH,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    return new AuthToken(token, expiresAt, TokenType.REFRESH, tokenPayload)
  }

  /**
   * 驗證 Token
   * @returns Token 負載或 null（如果無效或已過期）
   */
  verify(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
      return payload
    } catch {
      return null
    }
  }

  /**
   * 解析 Token 而不驗證簽名（用於獲取信息但不驗證真偽）
   */
  decode(token: string): TokenPayload | null {
    try {
      const payload = jwt.decode(token) as TokenPayload
      return payload
    } catch {
      return null
    }
  }

  /**
   * 檢查 Token 是否有效且未過期
   */
  isValid(token: string): boolean {
    const payload = this.verify(token)
    if (!payload) {
      return false
    }
    return payload.exp > Math.floor(Date.now() / 1000)
  }

  /**
   * 取得 Token 的剩餘過期時間（毫秒）
   */
  getTimeToExpire(token: string): number {
    const payload = this.decode(token)
    if (!payload) {
      return -1
    }
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, (payload.exp - now) * 1000)
  }

  /**
   * 檢查 Token 是否即將過期（少於 60 秒）
   */
  isAboutToExpire(token: string): boolean {
    return this.getTimeToExpire(token) < 60 * 1000
  }
}
