/**
 * IAuthTokenRepository
 *
 * Token 倉庫介面 - 用於儲存 Token 記錄和管理黑名單
 *
 * 責任：
 * - 儲存簽發的 Token 記錄
 * - 管理 Token 黑名單（登出）
 * - 查詢 Token 狀態
 */

export interface TokenRecord {
  id: string
  userId: string
  tokenHash: string
  type: 'access' | 'refresh'
  expiresAt: Date
  revokedAt?: Date
  createdAt: Date
}

export interface IAuthTokenRepository {
  /**
   * 儲存 Token 記錄
   */
  save(record: TokenRecord): Promise<void>

  /**
   * 根據 Token Hash 查找記錄
   */
  findByHash(tokenHash: string): Promise<TokenRecord | null>

  /**
   * 根據用戶 ID 取得所有有效的 Token
   */
  findByUserId(userId: string): Promise<TokenRecord[]>

  /**
   * 根據用戶 ID 取得所有已撤銷的 Token
   */
  findRevokedByUserId(userId: string): Promise<TokenRecord[]>

  /**
   * 撤銷 Token（將其加入黑名單）
   */
  revoke(tokenHash: string): Promise<void>

  /**
   * 檢查 Token 是否已被撤銷
   */
  isRevoked(tokenHash: string): Promise<boolean>

  /**
   * 根據用戶 ID 撤銷所有 Token（登出所有設備）
   */
  revokeAllByUserId(userId: string): Promise<void>

  /**
   * 清理過期的 Token 記錄
   */
  cleanupExpired(): Promise<void>

  /**
   * 刪除 Token 記錄
   */
  delete(id: string): Promise<void>
}
