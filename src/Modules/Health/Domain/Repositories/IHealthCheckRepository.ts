/**
 * IHealthCheckRepository
 * 健康檢查 Repository 介面 (倒依賴)
 */

import { HealthCheck } from '../Aggregates/HealthCheck'

export interface IHealthCheckRepository {
  /**
   * 根據 ID 查找健康檢查記錄
   */
  findById(id: string): Promise<HealthCheck | null>

  /**
   * 獲取最後一次健康檢查
   */
  findLatest(): Promise<HealthCheck | null>

  /**
   * 獲取所有健康檢查記錄 (分頁)
   */
  findAll(limit?: number): Promise<HealthCheck[]>

  /**
   * 保存健康檢查記錄
   */
  save(check: HealthCheck): Promise<void>

  /**
   * 刪除舊記錄 (清理)
   */
  deleteOlderThan(days: number): Promise<number>
}
