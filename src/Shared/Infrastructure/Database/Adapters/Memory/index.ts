/**
 * Memory ORM 適配器
 *
 * 此模組提供內存型 IDatabaseAccess 實現，用於開發環境或無真實數據庫時。
 *
 * @public - 匯出公開的工廠函數
 * @internal - 實現細節對外隱藏
 */

import { MemoryDatabaseAccess } from './MemoryDatabaseAccess'

export { MemoryDatabaseAccess } from './MemoryDatabaseAccess'

/**
 * 建立 Memory DatabaseAccess 實例
 *
 * 此工廠函數是唯一建立 Memory 適配器的方式
 */
export function createMemoryDatabaseAccess() {
  return new MemoryDatabaseAccess()
}
