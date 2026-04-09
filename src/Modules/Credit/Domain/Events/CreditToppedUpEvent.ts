import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 額度被充值時發佈
 *
 * 當用戶購買額度或管理員手動增加額度時發佈。此事件用於：
 * - 記錄充值歷史
 * - 觸發充值成功通知
 * - 清除低額度警告
 * - 更新財務記錄
 */
export class CreditToppedUpEvent extends DomainEvent {
	readonly creditAccountId: string
	readonly orgId: string
	readonly amount: string
	readonly newBalance: string
	readonly source: 'purchase' | 'manual_topup' | 'promotion' | 'refund'

	constructor(
		creditAccountId: string,
		orgId: string,
		amount: string,
		newBalance: string,
		source: 'purchase' | 'manual_topup' | 'promotion' | 'refund' = 'purchase',
	) {
		super(
			creditAccountId,
			'CreditToppedUpEvent',
			{
				creditAccountId,
				orgId,
				amount,
				newBalance,
				source,
			},
			1,
		)
		this.creditAccountId = creditAccountId
		this.orgId = orgId
		this.amount = amount
		this.newBalance = newBalance
		this.source = source
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
				newBalance: this.newBalance,
				source: this.source,
			},
		}
	}
}
