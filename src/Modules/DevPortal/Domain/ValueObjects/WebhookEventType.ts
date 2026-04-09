export const WEBHOOK_EVENT_TYPES = [
	'usage.threshold',
	'key.expiring',
	'key.revoked',
	'credit.low',
] as const

export type WebhookEventTypeValue = (typeof WEBHOOK_EVENT_TYPES)[number]

export class WebhookEventType {
	private constructor(private readonly value: WebhookEventTypeValue) {}

	static usageThreshold(): WebhookEventType {
		return new WebhookEventType('usage.threshold')
	}

	static keyExpiring(): WebhookEventType {
		return new WebhookEventType('key.expiring')
	}

	static keyRevoked(): WebhookEventType {
		return new WebhookEventType('key.revoked')
	}

	static creditLow(): WebhookEventType {
		return new WebhookEventType('credit.low')
	}

	static from(value: string): WebhookEventType {
		if (!WEBHOOK_EVENT_TYPES.includes(value as WebhookEventTypeValue)) {
			throw new Error(`無效的 Webhook 事件類型: ${value}`)
		}
		return new WebhookEventType(value as WebhookEventTypeValue)
	}

	getValue(): WebhookEventTypeValue {
		return this.value
	}

	equals(other: WebhookEventType): boolean {
		return this.value === other.value
	}
}
