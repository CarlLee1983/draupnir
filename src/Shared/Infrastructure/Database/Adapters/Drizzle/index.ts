/**
 * Drizzle ORM 適配器公開 API
 *
 * 此模組提供 Drizzle ORM 的適配實現，隱藏具體 ORM 細節
 * 暴露為 IDatabaseAccess 等公開介面
 *
 * @public - 匯出公開的工廠函數
 * @internal - 實現細節對外隱藏
 *
 * **使用方式**：
 * ```typescript
 * import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
 *
 * const db = createDrizzleDatabaseAccess()
 * const users = await db.table('users').select()
 * ```
 *
 * **切換到其他 ORM 時**：
 * 1. 建立新的適配器（如 `src/adapters/Prisma/`）
 * 2. 實現相同的公開介面
 * 3. 在 `src/wiring/` 中改變導入路徑
 * 4. 完成！所有業務層代碼無需改動
 */

export { createDrizzleDatabaseAccess } from './DrizzleDatabaseAdapter'
export { createDrizzleConnectivityCheck } from './DrizzleConnectivityCheck'
export type { DrizzleQueryBuilder } from './DrizzleQueryBuilder'
