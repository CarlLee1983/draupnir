/**
 * 基礎倉儲介面 - 定義所有倉儲的通用契約
 *
 * @public - Domain 層定義的公開介面，所有 Repository 實現都必須遵循此契約
 *
 * **分層設計**
 * - 定義位置：Domain 層（`src/Shared/Domain/IRepository.ts`）
 * - 實現位置：Infrastructure 層（`src/Modules/{Module}/Infrastructure/Repositories/`）
 * - 消費者：Application 層 Service、Controller
 *
 * **依賴反轉**
 * 高層（Application）依賴此抽象，不依賴具體實現。
 * 具體實現（Infrastructure Repository）依賴此抽象。
 *
 * ```
 * Application Service
 *     ↓ (依賴)
 * IRepository<T> (公開介面)
 *     ↑ (實現)
 * InfrastructureRepository (具體實現)
 * ```
 *
 * @design
 * - ORM 無關：Repository 實現對外隱藏 ORM 細節
 * - 泛型：支援任何實現 BaseEntity 的 Entity 類型
 * - 異步操作：所有方法都是異步，支援各種 ORM 和存儲層
 *
 * @example
 * ```typescript
 * // Domain 層：定義介面
 * export interface IUserRepository extends IRepository<User> {
 *   findByEmail(email: string): Promise<User | null>
 * }
 *
 * // Infrastructure 層：實現介面（使用任意 ORM）
 * export class UserRepository implements IUserRepository {
 *   constructor(private db: IDatabaseAccess) {}
 *
 *   async save(user: User): Promise<void> {
 *     await this.db.table('users').insert(this.toRow(user))
 *   }
 *
 *   async findById(id: string): Promise<User | null> {
 *     const row = await this.db.table('users')
 *       .where('id', '=', id)
 *       .first()
 *     return row ? this.toDomain(row) : null
 *   }
 * }
 *
 * // Application 層：使用 Repository（不知道實現細節）
 * export class UserService {
 *   constructor(private repo: IUserRepository) {}
 *
 *   async getUser(id: string): Promise<User | null> {
 *     return this.repo.findById(id)
 *   }
 * }
 * ```
 *
 * @see docs/ABSTRACTION_RULES.md - 依賴抽象化規則
 */

import type { BaseEntity } from './BaseEntity'

export interface IRepository<T extends BaseEntity> {
	/**
	 * 保存實體（新增或更新）
	 *
	 * 實現細節由具體 Repository 決定。根據 Entity 的狀態，
	 * 決定是執行 INSERT 還是 UPDATE 操作。
	 *
	 * @param entity - 要保存的實體
	 * @throws 若保存失敗，應拋出合適的錯誤
	 */
	save(entity: T): Promise<void>

	/**
	 * 根據 ID 查詢單個實體
	 *
	 * @param id - 實體 ID
	 * @returns 若實體存在返回該實體，否則返回 null
	 */
	findById(id: string): Promise<T | null>

	/**
	 * 刪除實體
	 *
	 * @param id - 要刪除的實體 ID
	 * @throws 若刪除失敗或實體不存在，行為由實現決定
	 */
	delete(id: string): Promise<void>

	/**
	 * 查詢所有實體（支援分頁和過濾）
	 *
	 * @param params - 查詢參數
	 * @param params.limit - 返回記錄數上限
	 * @param params.offset - 分頁偏移量
	 * @param params[key] - 其他過濾條件（由具體實現定義）
	 * @returns 符合條件的實體陣列
	 */
	findAll(params?: {
		limit?: number
		offset?: number
		[key: string]: any
	}): Promise<T[]>

	/**
	 * 計算符合條件的實體總數
	 *
	 * 常用於分頁計算總頁數。
	 *
	 * @param params - 過濾條件（必須與 findAll 相同）
	 * @returns 符合條件的實體總數
	 */
	count(params?: { [key: string]: any }): Promise<number>
}
