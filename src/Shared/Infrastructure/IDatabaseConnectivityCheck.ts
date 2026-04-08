/**
 * 資料庫連線檢查 Port（Port 模式）
 *
 * @public - ORM 無關的公開介面
 *
 * **職責**
 * - 僅負責「能否連上資料庫」的檢查
 * - 與具體 ORM/驅動完全解耦
 * - 用於健康檢查、診斷等場景
 *
 * **使用位置**
 * - Application 層：Health Check Service 使用此介面檢查狀態
 * - Infrastructure 層：ORM Adapter 實現此介面（如 Atlas Adapter）
 *
 * **Port 模式**
 * 這是 Hexagonal Architecture 中的「Port」概念：
 * - 定義了應用層與外部系統（資料庫）的邊界契約
 * - 應用層不知道底層如何實現
 * - 容易進行 Mock 測試
 *
 * @design
 * - 簡單：只有一個方法 `ping()`
 * - 非侵入式：不改變現有資料庫連接邏輯
 * - 可測試：容易 Mock 為假實現
 *
 * @example
 * ```typescript
 * // Application 層：健康檢查服務
 * export class HealthCheckService {
 *   constructor(private dbCheck: IDatabaseConnectivityCheck) {}
 *
 *   async checkDatabaseStatus(): Promise<boolean> {
 *     return this.dbCheck.ping()
 *   }
 * }
 *
 * // Infrastructure 層：Atlas Adapter 實現
 * export class AtlasDatabaseConnectivityCheck implements IDatabaseConnectivityCheck {
 *   async ping(): Promise<boolean> {
 *     try {
 *       await DB.raw('SELECT 1')
 *       return true
 *     } catch {
 *       return false
 *     }
 *   }
 * }
 *
 * // 測試中的 Mock 實現
 * class MockDatabaseConnectivityCheck implements IDatabaseConnectivityCheck {
 *   constructor(private isHealthy: boolean = true) {}
 *
 *   async ping(): Promise<boolean> {
 *     return this.isHealthy
 *   }
 * }
 * ```
 *
 * @see docs/ABSTRACTION_RULES.md - 依賴抽象化規則
 */
export interface IDatabaseConnectivityCheck {
	/**
	 * 執行資料庫連線檢查
	 *
	 * 實現應該執行一個簡單的資料庫查詢（如 `SELECT 1`）來驗證連接。
	 * 不應該進行複雜的查詢或修改操作。
	 *
	 * @returns `true` 表示資料庫連線正常，`false` 表示連線失敗
	 * @throws 不應該拋出異常，應該直接返回 false
	 */
	ping(): Promise<boolean>
}
