/**
 * Drizzle 連線檢查實現
 *
 * 實現 IDatabaseConnectivityCheck 介面
 * 用於健康檢查和連線驗證
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { getDrizzleInstance } from './config'

/**
 * 建立 Drizzle 連線檢查實例
 *
 * 此實例可用於驗證資料庫連線是否正常
 *
 * @returns 實現 IDatabaseConnectivityCheck 介面的實例
 *
 * @example
 * const check = createDrizzleConnectivityCheck()
 * const isConnected = await check.ping()
 * if (!isConnected) {
 *   console.error('Database connection failed')
 * }
 */
export function createDrizzleConnectivityCheck(): IDatabaseConnectivityCheck {
  return {
    async ping(): Promise<boolean> {
      try {
        const db = getDrizzleInstance()

        // 執行簡單的 SELECT 1 查詢來驗證連線
        await (db as any).execute?.('SELECT 1') || (db as any).run?.('SELECT 1')

        return true
      } catch (error) {
        console.error('Database connectivity check failed:', error)
        return false
      }
    },
  }
}
