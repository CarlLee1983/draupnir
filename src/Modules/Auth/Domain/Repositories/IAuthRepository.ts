/**
 * IAuthRepository
 * 認證 Repository 介面 (倒依賴)
 *
 * Domain 層定義介面，Infrastructure 層實現
 */

import type { User } from '../Aggregates/User'
import type { Email } from '../ValueObjects/Email'

export interface IAuthRepository {
  /**
   * 根據 ID 查找用戶
   */
  findById(id: string): Promise<User | null>

  /**
   * 根據電子郵件查找用戶
   */
  findByEmail(email: Email): Promise<User | null>

  /**
   * 檢查電子郵件是否已被註冊
   */
  emailExists(email: Email): Promise<boolean>

  /**
   * 保存（創建或更新）用戶
   */
  save(user: User): Promise<void>

  /**
   * 删除用戶
   */
  delete(id: string): Promise<void>

  /**
   * 取得所有用戶（分頁）
   */
  findAll(limit?: number, offset?: number): Promise<User[]>
}
