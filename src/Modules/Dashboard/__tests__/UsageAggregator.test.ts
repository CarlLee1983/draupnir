import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LogEntry } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'

describe('UsageAggregator', () => {
  let mock: MockGatewayClient
  let aggregator: UsageAggregator

  beforeEach(() => {
    mock = new MockGatewayClient()
    aggregator = new UsageAggregator(mock)
  })

  afterEach(() => {
    mock.reset()
  })

  it('應取得用量統計', async () => {
    mock.seedUsageStats({
      totalRequests: 500,
      totalCost: 12.5,
      totalTokens: 100000,
      avgLatency: 250,
    })
    const stats = await aggregator.getStats(['bfr-vk-1'])
    expect(stats.totalRequests).toBe(500)
    expect(stats.totalCost).toBeCloseTo(12.5)
    expect(stats.totalTokens).toBe(100000)
    expect(stats.avgLatency).toBe(250)
  })

  it('應取得用量 log 並回傳 LogEntry 陣列', async () => {
    const sampleLogs: LogEntry[] = [
      {
        timestamp: '2026-04-01T00:00:00Z',
        keyId: 'k-1',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        latencyMs: 450,
        cost: 0.05,
        status: 'success',
      },
      {
        timestamp: '2026-04-01T01:00:00Z',
        keyId: 'k-1',
        model: 'claude-3-sonnet',
        provider: 'anthropic',
        inputTokens: 80,
        outputTokens: 120,
        totalTokens: 200,
        latencyMs: 320,
        cost: 0.03,
        status: 'success',
      },
    ]
    mock.seedUsageLogs(sampleLogs)
    const logs = await aggregator.getLogs(['k-1'])
    expect(logs).toHaveLength(2)
    expect(logs[0].model).toBe('gpt-4')
    expect(logs[1].model).toBe('claude-3-sonnet')
  })

  it('無 Virtual Key 時應回傳空結果，不呼叫 gateway', async () => {
    const stats = await aggregator.getStats([])
    expect(stats.totalRequests).toBe(0)
    expect(stats.totalCost).toBe(0)
    expect(stats.totalTokens).toBe(0)
    expect(mock.calls.getUsageStats.length).toBe(0)

    const logs = await aggregator.getLogs([])
    expect(logs).toHaveLength(0)
    expect(mock.calls.getUsageLogs.length).toBe(0)
  })
})
