/**
 * Atlas QueryBuilder 實現
 *
 * 實現 IQueryBuilder 介面，將 Gravito Atlas ORM 的 API 適配為公開介面
 * 隱藏所有 Atlas 特定的 API 細節，提供統一的查詢 API。
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'

/**
 * 懶加載 Atlas DB 實例
 * @internal
 */
function getDB(): any {
	// biome-ignore lint/style/noCommaOperator: Required for dynamic import
	return (require('@gravito/atlas'), require('@gravito/atlas')).DB
}

/**
 * Atlas QueryBuilder 實現
 *
 * 將 Atlas 的查詢 API 轉換為標準的 IQueryBuilder 介面
 */
export class AtlasQueryBuilder implements IQueryBuilder {
	private whereConditions: Array<{ column: string; operator: string; value: unknown }> = []
	private orderByConfig: { column: string; direction: 'ASC' | 'DESC' } | null = null
	private limitValue: number | null = null
	private offsetValue: number | null = null

	constructor(private tableName: string) {}

	/**
	 * 添加 WHERE 條件
	 *
	 * @param column 欄位名稱
	 * @param operator 比較運算子（=, !=, >, <, >=, <=, like, in）
	 * @param value 比較值
	 * @returns 此 QueryBuilder 實例（用於鏈式調用）
	 */
	where(column: string, operator: string, value: unknown): IQueryBuilder {
		this.whereConditions.push({ column, operator, value })
		return this
	}

	/**
	 * 取得單筆記錄
	 *
	 * @returns 第一筆符合條件的記錄，或 null
	 */
	async first(): Promise<Record<string, unknown> | null> {
		try {
			let query = (getDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			// 應用排序
			if (this.orderByConfig) {
				const dir = this.orderByConfig.direction === 'ASC' ? 'asc' : 'desc'
				query = query.orderBy(this.orderByConfig.column, dir)
			}

			// 限制為 1 筆記錄
			query = query.limit(1)

			const results = await query

			return results[0] || null
		} catch (error) {
			console.error(`Error in first(): ${error}`)
			return null
		}
	}

	/**
	 * 取得多筆記錄
	 *
	 * @returns 符合條件的所有記錄
	 */
	async select(): Promise<Record<string, unknown>[]> {
		try {
			let query = (getDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			// 應用排序
			if (this.orderByConfig) {
				const dir = this.orderByConfig.direction === 'ASC' ? 'asc' : 'desc'
				query = query.orderBy(this.orderByConfig.column, dir)
			}

			// 應用 OFFSET
			if (this.offsetValue) {
				query = query.offset(this.offsetValue)
			}

			// 應用 LIMIT
			if (this.limitValue) {
				query = query.limit(this.limitValue)
			}

			return await query
		} catch (error) {
			console.error(`Error in select(): ${error}`)
			return []
		}
	}

	/**
	 * 插入新記錄
	 *
	 * @param data 要插入的資料
	 */
	async insert(data: Record<string, unknown>): Promise<void> {
		try {
			await (getDB() as any).table(this.tableName).insert(data)
		} catch (error) {
			console.error(`Error in insert(): ${error}`)
			throw error
		}
	}

	/**
	 * 更新記錄
	 *
	 * @param data 更新的資料
	 */
	async update(data: Record<string, unknown>): Promise<void> {
		try {
			let query = (getDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			await query.update(data)
		} catch (error) {
			console.error(`Error in update(): ${error}`)
			throw error
		}
	}

	/**
	 * 刪除記錄
	 */
	async delete(): Promise<void> {
		try {
			let query = (getDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			await query.delete()
		} catch (error) {
			console.error(`Error in delete(): ${error}`)
			throw error
		}
	}

	/**
	 * 限制返回的記錄數
	 *
	 * @param value 最多返回的記錄數
	 * @returns 此 QueryBuilder 實例
	 */
	limit(value: number): IQueryBuilder {
		this.limitValue = value
		return this
	}

	/**
	 * 分頁偏移
	 *
	 * @param value 跳過的記錄數
	 * @returns 此 QueryBuilder 實例
	 */
	offset(value: number): IQueryBuilder {
		this.offsetValue = value
		return this
	}

	/**
	 * 排序
	 *
	 * @param column 排序欄位
	 * @param direction 排序方向（ASC 或 DESC）
	 * @returns 此 QueryBuilder 實例
	 */
	orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): IQueryBuilder {
		const normalizedDirection = direction.toUpperCase() as 'ASC' | 'DESC'
		this.orderByConfig = { column, direction: normalizedDirection }
		return this
	}

	/**
	 * 計算符合條件的記錄數
	 *
	 * @returns 記錄總數
	 */
	async count(): Promise<number> {
		try {
			let query = (getDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			// Atlas 使用 count() 方法直接返回數字
			const count = await query.count()
			return count || 0
		} catch (error) {
			console.error(`Error in count(): ${error}`)
			return 0
		}
	}

	/**
	 * 範圍查詢
	 *
	 * @param column 欄位名稱
	 * @param range 範圍 [開始, 結束]
	 * @returns 此 QueryBuilder 實例
	 */
	whereBetween(column: string, range: [Date, Date]): IQueryBuilder {
		this.whereConditions.push({ column, operator: 'between', value: range })
		return this
	}

	/**
	 * 應用單個 WHERE 條件到查詢物件
	 * @private
	 */
	private applyWhere(query: any, cond: { column: string; operator: string; value: unknown }): any {
		switch (cond.operator) {
			case '=':
				return query.where(cond.column, '=', cond.value)
			case '!=':
			case '<>':
				return query.where(cond.column, '!=', cond.value)
			case '>':
				return query.where(cond.column, '>', cond.value)
			case '<':
				return query.where(cond.column, '<', cond.value)
			case '>=':
				return query.where(cond.column, '>=', cond.value)
			case '<=':
				return query.where(cond.column, '<=', cond.value)
			case 'like':
				return query.where(cond.column, 'like', cond.value)
			case 'in':
				return query.whereIn(cond.column, cond.value as any[])
			case 'between':
				return query.whereBetween(cond.column, cond.value as [Date, Date])
			default:
				throw new Error(`Unsupported operator: ${cond.operator}`)
		}
	}
}
