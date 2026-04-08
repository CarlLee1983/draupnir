import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { AtlasQueryBuilder } from './AtlasQueryBuilder'

/**
 * 懶加載 Atlas DB 實例
 * @internal
 */
function getDB(): any {
	// biome-ignore lint/style/noCommaOperator: Required for dynamic import
	return (require('@gravito/atlas'), require('@gravito/atlas')).DB
}

/**
 * Atlas DatabaseAccess 實現
 *
 * 實現 IDatabaseAccess 介面，將 Gravito Atlas ORM 適配為公開介面
 * 隱藏所有 Atlas 特定的 API 細節，提供統一的查詢介面。
 *
 * @internal 此實現是基礎設施層細節
 */
class AtlasDatabaseAccess implements IDatabaseAccess {
	/**
	 * 取得表的查詢建構器
	 *
	 * @param name 表名稱
	 * @returns QueryBuilder 實例，用於構建查詢
	 *
	 * @example
	 * const users = await db.table('users').select()
	 * const user = await db.table('users').where('id', '=', userId).first()
	 */
	table(name: string): IQueryBuilder {
		return new AtlasQueryBuilder(name)
	}
}

/**
 * 建立 Atlas DatabaseAccess 實例
 *
 * 此工廠函數是唯一建立 Atlas 適配器的方式
 * 應用層通過此函數注入 IDatabaseAccess
 *
 * @returns 實現 IDatabaseAccess 介面的實例
 *
 * @example
 * // 在 Wiring 層中使用
 * const db = createAtlasDatabaseAccess()
 * registerUserRepositories(db)
 *
 * // Repository 中使用
 * class UserRepository {
 *   constructor(private db: IDatabaseAccess) {}
 *   async findById(id: string) {
 *     return this.db.table('users').where('id', '=', id).first()
 *   }
 * }
 */
export function createAtlasDatabaseAccess(): IDatabaseAccess {
	return new AtlasDatabaseAccess()
}

/**
 * 適配器：以 Atlas 執行資料庫連線檢查（SELECT 1），實作 IDatabaseConnectivityCheck
 *
 * 供健康檢查等 Use Case 使用，Application 層不依賴 @gravito/atlas。
 */
export function createGravitoDatabaseConnectivityCheck(): IDatabaseConnectivityCheck {
	return {
		async ping(): Promise<boolean> {
			try {
				await getDB().raw('SELECT 1')
				return true
			} catch {
				return false
			}
		},
	}
}
