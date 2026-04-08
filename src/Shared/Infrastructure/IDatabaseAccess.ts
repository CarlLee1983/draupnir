/**
 * 數據庫存取抽象（Port）
 *
 * 定義與具體 ORM（如 Atlas）無關的查詢介面，讓各模組 Infrastructure 層
 * 可透過依賴注入替換為 mock，Domain/Application 與實際 DB 實作解耦。
 *
 * @public - 此介面是 ORM 無關的公開 API，所有層都可使用
 * @see docs/ABSTRACTION_RULES.md - 依賴抽象化規則
 */

/**
 * 數據庫查詢建構器介面（抽象鏈式 API，支援測試替換）
 *
 * 提供流暢的查詢 API，隱藏具體 ORM 實現細節。
 * 所有層都可以通過此介面與數據庫交互，無需知道實際使用哪個 ORM。
 *
 * @public - ORM 無關的公開 API
 *
 * @example
 * ```typescript
 * const user = await db.table('users').where('id', '=', '123').first()
 * const users = await db.table('users').where('status', '=', 'active').select()
 * await db.table('users').insert({ email: 'test@example.com' })
 * ```
 */
export interface IQueryBuilder {
	/**
	 * WHERE 條件
	 * @param column - 欄位名稱
	 * @param operator - 比較運算子 ('=', '!=', '>', '<', 'LIKE' 等)
	 * @param value - 比較值
	 * @returns 返回自身以支援鏈式調用
	 */
	where(column: string, operator: string, value: unknown): IQueryBuilder

	/**
	 * 取得單筆記錄
	 * @returns 若記錄存在則返回該記錄，否則返回 null
	 */
	first(): Promise<Record<string, unknown> | null>

	/**
	 * 取得多筆記錄
	 * @returns 記錄陣列
	 */
	select(): Promise<Record<string, unknown>[]>

	/**
	 * 新增記錄
	 * @param data - 要新增的數據
	 */
	insert(data: Record<string, unknown>): Promise<void>

	/**
	 * 更新記錄
	 * @param data - 要更新的數據
	 */
	update(data: Record<string, unknown>): Promise<void>

	/**
	 * 刪除記錄
	 */
	delete(): Promise<void>

	/**
	 * 限制返回記錄數
	 * @param n - 限制數量
	 * @returns 返回自身以支援鏈式調用
	 */
	limit(n: number): IQueryBuilder

	/**
	 * 分頁偏移量
	 * @param n - 偏移數量
	 * @returns 返回自身以支援鏈式調用
	 */
	offset(n: number): IQueryBuilder

	/**
	 * 排序
	 * @param column - 排序欄位
	 * @param direction - 排序方向 ('ASC' 或 'DESC')
	 * @returns 返回自身以支援鏈式調用
	 */
	orderBy(column: string, direction: 'ASC' | 'DESC'): IQueryBuilder

	/**
	 * 範圍查詢
	 * @param column - 欄位名稱
	 * @param range - 範圍 [開始, 結束]
	 * @returns 返回自身以支援鏈式調用
	 */
	whereBetween(column: string, range: [Date, Date]): IQueryBuilder

	/**
	 * 計算符合條件的記錄數
	 * @returns 記錄數量
	 */
	count(): Promise<number>
}

/**
 * 數據庫存取介面（用於依賴注入）
 *
 * 此介面隱藏具體 ORM 實現，提供 ORM 無關的數據庫訪問。
 * 所有層都應該通過此介面與數據庫交互。
 *
 * @public - ORM 無關的公開 API，所有層都可使用
 *
 * @design
 * - 不依賴具體 ORM 的 API
 * - 支援主流 ORM 的通用操作
 * - 當需要 ORM 特定功能時，應擴展此介面而非繞過它
 *
 * @example
 * ```typescript
 * // 在 Repository 中使用
 * export class UserRepository implements IUserRepository {
 *   constructor(private db: IDatabaseAccess) {}
 *
 *   async findById(id: string): Promise<User | null> {
 *     const row = await this.db.table('users')
 *       .where('id', '=', id)
 *       .first()
 *     return row ? this.toDomain(row) : null
 *   }
 * }
 * ```
 */
export interface IDatabaseAccess {
	/**
	 * 取得表的查詢建構器
	 * @param name - 表名稱
	 * @returns IQueryBuilder 實例，可鏈式調用
	 */
	table(name: string): IQueryBuilder
}

/**
 * 向後相容：沿用既有命名時可匯入此別名
 * @deprecated 使用 IDatabaseAccess 代替
 */
export type DatabaseAccess = IDatabaseAccess
