export class KeyHash {
	private constructor(private readonly hash: string) {}

	static async fromRawKey(rawKey: string): Promise<KeyHash> {
		const encoder = new TextEncoder()
		const data = encoder.encode(rawKey)
		const hashBuffer = await crypto.subtle.digest('SHA-256', data)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
		return new KeyHash(hashHex)
	}

	static fromExisting(hash: string): KeyHash {
		return new KeyHash(hash)
	}

	async matches(rawKey: string): Promise<boolean> {
		const other = await KeyHash.fromRawKey(rawKey)
		return this.hash === other.getValue()
	}

	getValue(): string {
		return this.hash
	}
}
