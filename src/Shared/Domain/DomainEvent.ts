/**
 * 領域事件抽象基類
 *
 * 所有領域事件的基礎，提供：
 * - 事件識別碼 (eventId - UUID)
 * - 聚合根識別 (aggregateId)
 * - 事件類型識別 (eventType)
 * - 發生時間戳 (occurredAt)
 * - 事件結構版本 (version - 用於事件遷移)
 * - 事件負載資料 (data)
 *
 * 子類必須實作 toJSON() 方法以支援序列化
 *
 * 版本管理：
 * - version: 事件結構的版本號（用於向後相容性）
 * - getSchemaVersion(): 返回語意版本 (MAJOR.MINOR.PATCH)
 */
export abstract class DomainEvent {
	readonly eventId: string = crypto.randomUUID()
	readonly aggregateId: string
	readonly aggregateType?: string
	readonly eventType: string
	readonly occurredAt: Date
	readonly version: number
	readonly data: Record<string, unknown>

	constructor(
		aggregateId: string,
		eventType: string,
		data: Record<string, unknown> = {},
		version: number = 1,
		occurredAt?: Date,
	) {
		this.aggregateId = aggregateId
		this.eventType = eventType
		this.occurredAt = occurredAt ?? new Date()
		this.version = version
		this.data = data
	}

	/**
	 * 獲取事件結構的語意版本 (MAJOR.MINOR.PATCH)
	 *
	 * 用於決定遷移策略：
	 * - 同一 MAJOR 版本：向後相容，使用遷移
	 * - 不同 MAJOR 版本：破壞性變更，可能需要特殊處理
	 *
	 * 預設實作：版本號直接映射到語意版本
	 * 子類可覆蓋此方法以提供自訂映射
	 */
	getSchemaVersion(): string {
		const versions: Record<number, string> = {
			1: '1.0.0', // 初始版本
			2: '1.1.0', // 非破壞性新增
			3: '1.2.0',
			// 更多版本號映射...
		}
		return versions[this.version] ?? `1.${this.version - 1}.0`
	}

	/**
	 * 序列化事件為 JSON 物件
	 */
	abstract toJSON(): Record<string, unknown>
}
