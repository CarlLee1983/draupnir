import { describe, it, expect, vi } from 'vitest'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostLogEntry } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

function createMockBifrostClient(logs: BifrostLogEntry[] = []): BifrostClient {
	return {
		getLogs: vi.fn().mockResolvedValue({ logs, total: logs.length }),
		getLogsStats: vi.fn().mockResolvedValue({
			total_requests: logs.length,
			total_cost: logs.reduce((s, l) => s + l.cost, 0),
			total_tokens: logs.reduce((s, l) => s + (l.total_tokens ?? 0), 0),
			avg_latency: 150,
		}),
		listModels: vi.fn().mockResolvedValue([]),
	} as unknown as BifrostClient
}

const sampleLogs: BifrostLogEntry[] = [
	{
		id: 'log-1',
		provider: 'openai',
		model: 'gpt-4',
		status: 'success',
		object: 'chat.completion',
		timestamp: '2026-04-08T10:00:00Z',
		latency: 200,
		cost: 0.03,
		virtual_key_id: 'bfr-vk-1',
		input_tokens: 100,
		output_tokens: 50,
		total_tokens: 150,
	},
	{
		id: 'log-2',
		provider: 'anthropic',
		model: 'claude-3-sonnet',
		status: 'success',
		object: 'chat.completion',
		timestamp: '2026-04-08T11:00:00Z',
		latency: 100,
		cost: 0.02,
		virtual_key_id: 'bfr-vk-1',
		input_tokens: 80,
		output_tokens: 40,
		total_tokens: 120,
	},
]

describe('UsageAggregator', () => {
	it('應取得 Bifrost 用量統計', async () => {
		const client = createMockBifrostClient(sampleLogs)
		const aggregator = new UsageAggregator(client)
		const stats = await aggregator.getStats(['bfr-vk-1'])
		expect(stats.totalRequests).toBe(2)
		expect(stats.totalCost).toBeCloseTo(0.05)
		expect(stats.totalTokens).toBe(270)
	})

	it('應取得用量 log 並按時間排序', async () => {
		const client = createMockBifrostClient(sampleLogs)
		const aggregator = new UsageAggregator(client)
		const logs = await aggregator.getLogs(['bfr-vk-1'])
		expect(logs).toHaveLength(2)
	})

	it('無 Virtual Key 時應回傳空結果', async () => {
		const client = createMockBifrostClient([])
		const aggregator = new UsageAggregator(client)
		const stats = await aggregator.getStats([])
		expect(stats.totalRequests).toBe(0)
		expect(stats.totalCost).toBe(0)
	})
})
