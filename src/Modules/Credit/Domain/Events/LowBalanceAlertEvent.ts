import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 額度低於警告閾值時發佈
 *
 * 當額度扣除後低於設定閾值（如 100 credits）時發佈。此事件用於：
 * - 觸發用戶端警告通知
 * - 記錄警告日誌
 * - 準備二次確認或自動充值流程
 * - 監控警告趨勢
 */
export class LowBalanceAlertEvent extends DomainEvent {
	readonly creditAccountId: string
	readonly orgId: string
	readonly currentBalance: string
	readonly threshold: string
	readonly percentageRemaining: number

	constructor(
		creditAccountId: string,
		orgId: string,
		currentBalance: string,
		threshold: string,
		percentageRemaining: number,
	) {
		super(
			creditAccountId,
			'LowBalanceAlertEvent',
			{
				creditAccountId,
				orgId,
				currentBalance,
				threshold,
				percentageRemaining,
			},
			1,
		)
		this.creditAccountId = creditAccountId
		this.orgId = orgId
		this.currentBalance = currentBalance
		this.threshold = threshold
		this.percentageRemaining = percentageRemaining
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
				currentBalance: this.currentBalance,
				threshold: this.threshold,
				percentageRemaining: this.percentageRemaining,
			},
		}
	}
}
