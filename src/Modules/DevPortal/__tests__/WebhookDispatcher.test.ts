import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebhookDispatcher } from '../Infrastructure/Services/WebhookDispatcher'
import { WebhookSecret } from '../Domain/ValueObjects/WebhookSecret'

describe('WebhookDispatcher', () => {
	let dispatcher: WebhookDispatcher
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		dispatcher = new WebhookDispatcher()
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	function stubFetch(mock: ReturnType<typeof vi.fn>): void {
		globalThis.fetch = mock as unknown as typeof globalThis.fetch
	}

	it('應成功發送 webhook 通知', async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))
		stubFetch(mockFetch)

		const secret = WebhookSecret.fromExisting('whsec_test_key')
		const result = await dispatcher.dispatch({
			url: 'https://example.com/webhook',
			secret,
			eventType: 'key.revoked',
			payload: { keyId: 'k-1', revokedAt: '2026-04-09T10:00:00Z' },
		})

		expect(result.success).toBe(true)
		expect(mockFetch).toHaveBeenCalledOnce()

		const [callUrl, callOptions] = mockFetch.mock.calls[0] as [string, RequestInit]
		expect(callUrl).toBe('https://example.com/webhook')
		expect(callOptions.method).toBe('POST')
		expect((callOptions.headers as Record<string, string>)['Content-Type']).toBe('application/json')
		expect((callOptions.headers as Record<string, string>)['X-Webhook-Signature']).toBeTruthy()
		expect((callOptions.headers as Record<string, string>)['X-Webhook-Event']).toBe('key.revoked')

		const body = callOptions.body as string
		const signature = (callOptions.headers as Record<string, string>)['X-Webhook-Signature']
		expect(secret.verify(body, signature)).toBe(true)
	})

	it('應在 HTTP 失敗時重試（最多 3 次）', async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(new Response('Error', { status: 500 }))
			.mockResolvedValueOnce(new Response('Error', { status: 502 }))
			.mockResolvedValueOnce(new Response('OK', { status: 200 }))
		stubFetch(mockFetch)

		const secret = WebhookSecret.fromExisting('whsec_test_key')
		const result = await dispatcher.dispatch({
			url: 'https://example.com/webhook',
			secret,
			eventType: 'credit.low',
			payload: { balance: 5.0 },
		})

		expect(result.success).toBe(true)
		expect(mockFetch).toHaveBeenCalledTimes(3)
	})

	it('3 次都失敗應回傳失敗', async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response('Error', { status: 500 }))
		stubFetch(mockFetch)

		const secret = WebhookSecret.fromExisting('whsec_test_key')
		const result = await dispatcher.dispatch({
			url: 'https://example.com/webhook',
			secret,
			eventType: 'usage.threshold',
			payload: { usage: 90 },
		})

		expect(result.success).toBe(false)
		expect(result.error).toBeTruthy()
		expect(mockFetch).toHaveBeenCalledTimes(3)
	})

	it('fetch 拋出異常時應重試', async () => {
		const mockFetch = vi
			.fn()
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce(new Response('OK', { status: 200 }))
		stubFetch(mockFetch)

		const secret = WebhookSecret.fromExisting('whsec_test_key')
		const result = await dispatcher.dispatch({
			url: 'https://example.com/webhook',
			secret,
			eventType: 'key.expiring',
			payload: { keyId: 'k-2', expiresAt: '2026-04-20' },
		})

		expect(result.success).toBe(true)
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('payload 應包含 event 和 data 欄位', async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))
		stubFetch(mockFetch)

		const secret = WebhookSecret.fromExisting('whsec_test_key')
		await dispatcher.dispatch({
			url: 'https://example.com/webhook',
			secret,
			eventType: 'credit.low',
			payload: { balance: 3.5 },
		})

		const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
		expect(body.event).toBe('credit.low')
		expect(body.data).toEqual({ balance: 3.5 })
		expect(body.timestamp).toBeTruthy()
		expect(body.id).toBeTruthy()
	})
})
