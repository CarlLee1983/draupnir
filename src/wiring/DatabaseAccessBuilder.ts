/**
 * Database Access Builder - 為 Repository 提供適當的 IDatabaseAccess
 *
 * 核心理念（與 FactoryMapBuilder 的根本差異）：
 * ❌ 不再：每個 ORM 對應不同的 Repository 類（UserRepository vs DrizzleUserRepository）
 * ✅ 改為：只有一個 Repository 類，根據 IDatabaseAccess 決定內存或數據庫實現
 *
 * 職責：
 * 根據 ORM 類型決定為 Repository 注入什麼 IDatabaseAccess 實現
 *
 * 架構特點：
 * ✅ 只有一個 Repository 實現（無 DrizzleUserRepository、PrismaPostRepository 等）
 * ✅ Repository 透過 IDatabaseAccess 使用 ORM，完全無感知具體 ORM
 * ✅ 所有 ORM 選擇決策在此集中，bootstrap 層控制
 * ✅ 新增 ORM 時只需在此加入新的適配器初始化
 * ✅ 完全遵循依賴注入原則
 *
 * 設計優勢：
 * - 零重複：Repository 代碼只有一份
 * - 透明性：Repository 不知道使用了什麼 ORM
 * - 靈活性：輕易切換 ORM（只改環境變數）
 * - 可測性：易於注入 mock IDatabaseAccess 進行測試
 *
 * @example
 * // bootstrap.ts - 非常簡潔！
 * const orm = getCurrentORM()
 * const builder = new DatabaseAccessBuilder(orm)
 * const db = builder.getDatabaseAccess()
 *
 * registerUserRepositories(db)
 * registerPostRepositories(db)
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import type { ORMType } from './RepositoryFactory'
import { getDatabaseAccess } from './RepositoryFactory'

/**
 * Database Access Builder
 *
 * 根據 ORM 類型決定為 Repository 注入什麼 IDatabaseAccess
 *
 * 設計：
 * - Memory 模式：返回 MemoryDatabaseAccess（上層預設，Repository 無需分支）
 * - Drizzle/Prisma/Atlas：初始化並返回對應的 IDatabaseAccess 實現
 */
export class DatabaseAccessBuilder {
	private orm: ORMType
	private dbInstance: IDatabaseAccess

	/**
	 * 初始化 DatabaseAccessBuilder
	 *
	 * @param orm 選擇的 ORM 類型
	 *
	 * 行為：
	 * - 若 orm='memory'：注入 MemoryDatabaseAccess（內存表，同上層預設）
	 * - 若 orm='drizzle'：初始化 Drizzle DatabaseAccess
	 * - 若 orm='prisma'：初始化 Prisma DatabaseAccess
	 * - 若 orm='atlas'：初始化 Atlas DatabaseAccess
	 */
	constructor(orm: ORMType) {
		this.orm = orm
		this.dbInstance =
			orm === 'memory' ? new MemoryDatabaseAccess() : (getDatabaseAccess() as IDatabaseAccess)
	}

	/**
	 * 取得應該注入給 Repository 的 IDatabaseAccess
	 *
	 * 行為：
	 * - Memory 模式：返回 MemoryDatabaseAccess
	 * - 其他 ORM：返回對應的 IDatabaseAccess 實現
	 *
	 * Repository 僅依賴 IDatabaseAccess，不再在底層做 if (db) 分支。
	 *
	 * @returns IDatabaseAccess（必為非 undefined）
	 */
	getDatabaseAccess(): IDatabaseAccess {
		return this.dbInstance
	}

	/**
	 * 取得當前選擇的 ORM 類型
	 */
	getORM(): ORMType {
		return this.orm
	}

	/**
	 * 列出支援的 ORM
	 */
	static listSupportedORMs(): ORMType[] {
		return ['memory', 'drizzle', 'atlas', 'prisma']
	}
}

/**
 * 便利方法：快速構建 DatabaseAccessBuilder 並取得 IDatabaseAccess
 *
 * @example
 * const db = createDatabaseAccess('drizzle')
 * registerUserRepositories(db)
 */
export function createDatabaseAccess(orm: ORMType): IDatabaseAccess {
	return new DatabaseAccessBuilder(orm).getDatabaseAccess()
}
