export const KeyStatusValues = ['pending', 'active', 'revoked'] as const
export type KeyStatusType = (typeof KeyStatusValues)[number]

export class KeyStatus {
	private constructor(private readonly value: KeyStatusType) {}

	static pending(): KeyStatus {
		return new KeyStatus('pending')
	}

	static active(): KeyStatus {
		return new KeyStatus('active')
	}

	static revoked(): KeyStatus {
		return new KeyStatus('revoked')
	}

	static from(value: string): KeyStatus {
		if (!KeyStatusValues.includes(value as KeyStatusType)) {
			throw new Error(`無效的 Key 狀態: ${value}`)
		}
		return new KeyStatus(value as KeyStatusType)
	}

	isPending(): boolean {
		return this.value === 'pending'
	}

	isActive(): boolean {
		return this.value === 'active'
	}

	isRevoked(): boolean {
		return this.value === 'revoked'
	}

	getValue(): KeyStatusType {
		return this.value
	}
}
