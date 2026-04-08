/**
 * Redis 服務介面（Port）
 *
 * 底層完全不知道 Gravito/Plasma 的存在，
 * 允許日後換框架或用 InMemory 實作進行測試。
 */

export interface IRedisService {
	/**
	 * 連線測試，回傳 PONG 或丟出例外
	 */
	ping(): Promise<string>

	/**
	 * 取得字串值，key 不存在時回傳 null
	 */
	get(key: string): Promise<string | null>

	/**
	 * 設定字串值，可選到期秒數
	 *
	 * @param key - Redis key
	 * @param value - 字串值
	 * @param expiresInSeconds - 選擇性的到期時間（秒）
	 */
	set(key: string, value: string, expiresInSeconds?: number): Promise<void>

	/**
	 * 刪除 key
	 */
	del(key: string): Promise<void>

	/**
	 * 檢查 key 是否存在
	 */
	exists(key: string): Promise<boolean>
}
