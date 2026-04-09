import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 額度被扣除時發佈
 *
 * 當用戶使用 API 時，Credit 被扣減。此事件用於：
 * - 記錄扣減歷史
 * - 觸發低額度警告
 * - 更新使用統計
 * - 觸發可觀測性（日誌、指標）
 */
export class CreditDeductedEvent extends DomainEvent {
	readonly creditAccountId: string
	readonly orgId: string
	readonly amount: string
	readonly remainingBalance: string
	readonly reason: 'api_call' | 'manual_deduction' | 'refund_reversal'

	constructor(
		creditAccountId: string,
		orgId: string,
		amount: string,
		remainingBalance: string,
		reason: 'api_call' | 'manual_deduction' | 'refund_reversal' = 'api_call',
	) {
		super(
			creditAccountId,
			'CreditDeductedEvent',
			{
				creditAccountId,
				orgId,
				amount,
				remainingBalance,
				reason,
			},
			1,
		)
		this.creditAccountId = creditAccountId
		this.orgId = orgId
		this.amount = amount
		this.remainingBalance = remainingBalance
		this.reason = reason
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			aggregateId: this.aggregateId,
			eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(),
			version: this.version,
			data: {
				creditAccountId: this.creditAccountId,
				orgId: this.orgId,
				amount: this.amount,
				remainingBalance: this.remainingBalance,
				reason: this.reason,
			},
		}
	}
}
