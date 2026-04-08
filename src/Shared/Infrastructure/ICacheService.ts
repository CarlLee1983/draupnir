/**
 * 快取服務介面（Port）
 *
 * 應用層依賴此介面而非具體框架實作（如 Gravito Stasis）。
 * 支援透過測試框架或其他快取實作進行替換。
 */

export interface ICacheService {
	/**
	 * 從快取取得值
	 *
	 * @param key - 快取 key
	 * @returns 快取值或 null（不存在或已過期）
	 */
	get<T = unknown>(key: string): Promise<T | null>

	/**
	 * 設定快取值
	 *
	 * @param key - 快取 key
	 * @param value - 快取值
	 * @param ttlSeconds - 生存時間（秒），可選
	 */
	set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>

	/**
	 * 刪除快取 key
	 */
	forget(key: string): Promise<void>

	/**
	 * 清空所有快取
	 */
	flush(): Promise<void>
}
