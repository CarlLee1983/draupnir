/**
 * 聚合根基類 - Event Sourcing 支援
 *
 * 繼承 BaseEntity，提供：
 * - 事件產生 (raiseEvent)
 * - 事件回放 (loadFromEvents)
 * - 未提交事件管理 (getUncommittedEvents, markEventsAsCommitted)
 * - 聚合版本控制 (getVersion)
 *
 * 子類必須實作 applyEvent() 方法以定義事件如何影響聚合狀態
 */

import { BaseEntity } from './BaseEntity'
import type { DomainEvent } from './DomainEvent'

export abstract class AggregateRoot extends BaseEntity {
	/** 已套用事件的總數（聚合版本） */
	private appliedEventCount = 0

	/** 未提交的領域事件 */
	private uncommittedEvents: DomainEvent[] = []

	/**
	 * 產生領域事件：先套用狀態變更，再加入未提交清單
	 */
	protected raiseEvent(event: DomainEvent): void {
		this.applyEvent(event)
		this.uncommittedEvents.push(event)
		this.appliedEventCount++
	}

	/**
	 * 子類實作：定義單一事件如何影響聚合狀態
	 */
	abstract applyEvent(event: DomainEvent): void

	/**
	 * 從事件流回放重建聚合狀態
	 * 只呼叫 applyEvent，不加入未提交事件
	 */
	loadFromEvents(events: readonly DomainEvent[]): void {
		for (const event of events) {
			this.applyEvent(event)
			this.appliedEventCount++
		}
	}

	/**
	 * 取得未提交的領域事件（回傳唯讀副本）
	 */
	getUncommittedEvents(): ReadonlyArray<DomainEvent> {
		return [...this.uncommittedEvents]
	}

	/**
	 * 標記所有事件為已提交，清除未提交清單
	 */
	markEventsAsCommitted(): void {
		this.uncommittedEvents = []
	}

	/**
	 * 取得聚合版本號（已套用事件的總數）
	 */
	getVersion(): number {
		return this.appliedEventCount
	}
}
