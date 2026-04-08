/**
 * Atlas ORM 適配器
 *
 * 此模組提供 Gravito Atlas ORM 的適配實現，隱藏具體 ORM 細節，
 * 暴露為 IDatabaseAccess 等公開介面。
 *
 * @public - 匯出公開的工廠函數
 * @internal - 實現細節對外隱藏
 *
 * **使用方式**：
 * ```typescript
 * import { createAtlasDatabaseAccess } from '@/adapters/Atlas'
 *
 * const db = createAtlasDatabaseAccess()
 * const users = await db.table('users').select()
 * ```
 *
 * **當切換到其他 ORM 時（如 Drizzle）：**
 * 1. 建立 `src/adapters/Drizzle/` 資料夾
 * 2. 實現相同的公開介面
 * 3. 在 `src/wiring/` 中改變導入路徑
 * 4. 完成！所有業務層代碼無需改動
 */

export { createAtlasDatabaseAccess, createGravitoDatabaseConnectivityCheck } from './GravitoDatabaseAdapter'
export type { AtlasQueryBuilder } from './AtlasQueryBuilder'
