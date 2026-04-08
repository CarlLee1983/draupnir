/**
 * 基礎實體 - DDD 聚合根基類
 *
 * 所有 Domain Entity 應繼承此類別，提供：
 * - ID 管理
 * - 時間戳（建立、修改）
 * - 相等性判斷
 */

export abstract class BaseEntity {
	protected id: string
	protected createdAt: Date
	protected updatedAt: Date

	constructor(id?: string) {
		this.id = id || crypto.randomUUID()
		this.createdAt = new Date()
		this.updatedAt = new Date()
	}

	getId(): string {
		return this.id
	}

	getCreatedAt(): Date {
		return this.createdAt
	}

	getUpdatedAt(): Date {
		return this.updatedAt
	}

	setUpdatedAt(date: Date): void {
		this.updatedAt = date
	}

	/**
	 * 比較兩個實體是否相同（基於 ID）
	 */
	equals(other: BaseEntity): boolean {
		return this.id === other.id
	}

	/**
	 * 實體的字符串表示
	 */
	toString(): string {
		return `${this.constructor.name}(${this.id})`
	}
}
