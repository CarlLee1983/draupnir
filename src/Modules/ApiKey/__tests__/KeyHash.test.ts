import { describe, it, expect } from 'vitest'
import { KeyHash } from '../Domain/ValueObjects/KeyHash'

describe('KeyHash', () => {
	it('應從原始 key 產生 SHA-256 hash', async () => {
		const result = await KeyHash.fromRawKey('drp_sk_test123')
		expect(result.getValue()).toMatch(/^[a-f0-9]{64}$/)
	})

	it('相同 key 應產生相同 hash', async () => {
		const h1 = await KeyHash.fromRawKey('drp_sk_abc')
		const h2 = await KeyHash.fromRawKey('drp_sk_abc')
		expect(h1.getValue()).toBe(h2.getValue())
	})

	it('不同 key 應產生不同 hash', async () => {
		const h1 = await KeyHash.fromRawKey('drp_sk_abc')
		const h2 = await KeyHash.fromRawKey('drp_sk_xyz')
		expect(h1.getValue()).not.toBe(h2.getValue())
	})

	it('應從已有 hash 重建', () => {
		const hash = 'a'.repeat(64)
		const kh = KeyHash.fromExisting(hash)
		expect(kh.getValue()).toBe(hash)
	})

	it('matches 應正確比對', async () => {
		const kh = await KeyHash.fromRawKey('drp_sk_test')
		expect(await kh.matches('drp_sk_test')).toBe(true)
		expect(await kh.matches('drp_sk_wrong')).toBe(false)
	})
})
