/**
 * AuthToken 值物件
 *
 * 責任：
 * - JWT 令牌的封裝
 * - 令牌過期時間管理
 * - 令牌類型管理（Access、Refresh）
 *
 * 注：實際的 JWT 簽發和驗證由 JwtTokenService 負責
 */

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
  permissions: string[]
  jti: string
  iat: number
  exp: number
  type: TokenType
}

export class AuthToken {
  private readonly token: string
  private readonly expiresAt: Date
  private readonly type: TokenType
  private readonly payload?: TokenPayload

  constructor(
    token: string,
    expiresAt: Date,
    type: TokenType = TokenType.ACCESS,
    payload?: TokenPayload
  ) {
    this.token = token
    this.expiresAt = expiresAt
    this.type = type
    this.payload = payload
  }

  /**
   * 取得令牌字符串
   */
  getValue(): string {
    return this.token
  }

  /**
   * 取得過期時間
   */
  getExpiresAt(): Date {
    return this.expiresAt
  }

  /**
   * 取得令牌類型
   */
  getType(): TokenType {
    return this.type
  }

  /**
   * 取得令牌負載（如果可用）
   */
  getPayload(): TokenPayload | undefined {
    return this.payload
  }

  /**
   * 檢查令牌是否已過期
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  /**
   * 檢查是否為 Access Token
   */
  isAccessToken(): boolean {
    return this.type === TokenType.ACCESS
  }

  /**
   * 檢查是否為 Refresh Token
   */
  isRefreshToken(): boolean {
    return this.type === TokenType.REFRESH
  }

  /**
   * 轉換為字符串
   */
  toString(): string {
    return this.token
  }
}
