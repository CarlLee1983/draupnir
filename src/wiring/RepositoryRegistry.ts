/**
 * Repository Registry - 分布式的 Repository 工廠註冊
 *
 * 設計原則：
 * - 每個模組自己註冊其 Repository 工廠
 * - 避免 RepositoryFactory 的單點擁堵（monolithic factory）
 * - 遵循開放封閉原則（Open/Closed Principle）
 * - 新增模組時無需修改此檔案
 *
 * 架構：
 * ```
 * Module A                          Module B
 * └─ registerRepositories()         └─ registerRepositories()
 *    └─ registry.register()            └─ registry.register()
 *
 * All → RepositoryRegistry
 *       └─ RepositoryFactory
 *          └─ ORM 選擇邏輯
 * ```
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

/**
 * Repository Factory 函數類型
 * 每個模組為其 Repository 提供一個工廠函數
 */
export type RepositoryFactory = (
	orm: string,
	databaseAccess: IDatabaseAccess | undefined
) => any

/**
 * Repository Registry - 集中管理所有 Repository 工廠
 *
 * 好處：
 * - ✅ 每個模組在自己的檔案中註冊工廠
 * - ✅ RepositoryFactory 不需要知道所有模組
 * - ✅ 新增模組時無需修改此檔案
 * - ✅ 易於測試和模擬
 */
export class RepositoryRegistry {
	private factories = new Map<string, RepositoryFactory>()

	/**
	 * 註冊一個 Repository 工廠
	 *
	 * @param type Repository 類型（'user'、'post'、'order'...）
	 * @param factory 工廠函數
	 *
	 * @example
	 * registry.register('user', (orm, db) => {
	 *   if (orm === 'memory') return new UserRepository()
	 *   if (orm === 'drizzle') return new DrizzleUserRepository(db!)
	 * })
	 */
	register(type: string, factory: RepositoryFactory): void {
		if (this.factories.has(type)) {
			console.warn(`⚠️ Repository type "${type}" 已被註冊，將覆寫`)
		}
		this.factories.set(type, factory)
	}

	/**
	 * 建立指定類型的 Repository
	 *
	 * @param type Repository 類型
	 * @param orm 當前 ORM 選擇
	 * @param databaseAccess Database 適配器（可選）
	 * @returns Repository 實例
	 *
	 * @throws 如果 Repository 類型未註冊
	 */
	create(type: string, orm: string, databaseAccess: IDatabaseAccess | undefined): any {
		const factory = this.factories.get(type)

		if (!factory) {
			throw new Error(
				`❌ Repository 類型 "${type}" 未註冊。\n` +
					`已註冊的類型：${Array.from(this.factories.keys()).join(', ')}`
			)
		}

		return factory(orm, databaseAccess)
	}

	/**
	 * 列出所有已註冊的 Repository 類型
	 */
	listRegistered(): string[] {
		return Array.from(this.factories.keys())
	}

	/**
	 * 檢查某個 Repository 類型是否已註冊
	 */
	has(type: string): boolean {
		return this.factories.has(type)
	}
}

/**
 * 全局 Registry 單例
 * 應用啟動時被初始化
 */
let globalRegistry: RepositoryRegistry | null = null

/**
 * 初始化全局 Registry
 * 應在 bootstrap() 時調用，在註冊所有 ServiceProvider 之前
 *
 * @example
 * const registry = initializeRegistry()
 * registry.register('user', userRepositoryFactory)
 * registry.register('post', postRepositoryFactory)
 */
export function initializeRegistry(): RepositoryRegistry {
	if (!globalRegistry) {
		globalRegistry = new RepositoryRegistry()
	}
	return globalRegistry
}

/**
 * 取得全局 Registry
 */
export function getRegistry(): RepositoryRegistry {
	if (!globalRegistry) {
		throw new Error(
			'❌ RepositoryRegistry 尚未初始化。\n' +
				'請在 bootstrap() 中呼叫 initializeRegistry()。'
		)
	}
	return globalRegistry
}

/**
 * 重設 Registry（主要用於測試）
 */
export function resetRegistry(): void {
	globalRegistry = null
}
