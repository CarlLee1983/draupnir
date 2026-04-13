import { beforeEach, describe, expect, it } from 'bun:test'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway/errors'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'

describe('MockGatewayClient', () => {
  let mock: MockGatewayClient

  beforeEach(() => {
    mock = new MockGatewayClient()
  })

  describe('createKey', () => {
    it('assigns monotonic IDs starting at mock_vk_000001', async () => {
      const result = await mock.createKey({ name: 'test-key' })
      expect(result.id).toBe('mock_vk_000001')
    })

    it('assigns mock_vk_000002 on second call', async () => {
      await mock.createKey({ name: 'key-1' })
      const result = await mock.createKey({ name: 'key-2' })
      expect(result.id).toBe('mock_vk_000002')
    })

    it('returns value as mock_raw_key_000001 on first call', async () => {
      const result = await mock.createKey({ name: 'test-key' })
      expect(result.value).toBe('mock_raw_key_000001')
    })

    it('defaults isActive to true when not specified', async () => {
      const result = await mock.createKey({ name: 'test-key' })
      expect(result.isActive).toBe(true)
    })

    it('respects isActive=false when specified', async () => {
      const result = await mock.createKey({ name: 'test-key', isActive: false })
      expect(result.isActive).toBe(false)
    })

    it('records call in mock.calls.createKey', async () => {
      const request = { name: 'test-key' }
      await mock.createKey(request)
      expect(mock.calls.createKey).toHaveLength(1)
      expect(mock.calls.createKey[0]).toEqual(request)
    })

    it('stores key in internal state', async () => {
      const created = await mock.createKey({ name: 'test-key' })
      // Verify by updating: if key doesn't exist, updateKey would throw
      const updated = await mock.updateKey(created.id, { isActive: false })
      expect(updated.id).toBe(created.id)
    })
  })

  describe('updateKey', () => {
    it('merges isActive update and returns updated KeyResponse', async () => {
      const created = await mock.createKey({ name: 'test-key', isActive: true })
      const updated = await mock.updateKey(created.id, { isActive: false })
      expect(updated.id).toBe(created.id)
      expect(updated.isActive).toBe(false)
    })

    it('records call in mock.calls.updateKey', async () => {
      const created = await mock.createKey({ name: 'test-key' })
      await mock.updateKey(created.id, { isActive: false })
      expect(mock.calls.updateKey).toHaveLength(1)
      expect(mock.calls.updateKey[0].keyId).toBe(created.id)
      expect(mock.calls.updateKey[0].request).toEqual({ isActive: false })
    })

    it('throws GatewayError NOT_FOUND when key does not exist', async () => {
      await expect(mock.updateKey('nonexistent', { isActive: false })).rejects.toThrow(GatewayError)
    })
  })

  describe('deleteKey', () => {
    it('removes key from internal state', async () => {
      const created = await mock.createKey({ name: 'test-key' })
      await mock.deleteKey(created.id)
      // Verify removal: subsequent updateKey should fail
      await expect(mock.updateKey(created.id, { isActive: false })).rejects.toThrow(GatewayError)
    })

    it('records keyId in mock.calls.deleteKey', async () => {
      const created = await mock.createKey({ name: 'test-key' })
      await mock.deleteKey(created.id)
      expect(mock.calls.deleteKey).toHaveLength(1)
      expect(mock.calls.deleteKey[0]).toBe(created.id)
    })
  })

  describe('getUsageStats', () => {
    it('returns default zero stats when not seeded', async () => {
      const stats = await mock.getUsageStats(['key-1'])
      expect(stats.totalRequests).toBe(0)
      expect(stats.totalCost).toBe(0)
      expect(stats.totalTokens).toBe(0)
      expect(stats.avgLatency).toBe(0)
    })

    it('returns seeded stats after seedUsageStats() is called', async () => {
      const seeded = { totalRequests: 10, totalCost: 0.5, totalTokens: 1000, avgLatency: 250 }
      mock.seedUsageStats(seeded)
      const stats = await mock.getUsageStats(['key-1'])
      expect(stats).toEqual(seeded)
    })

    it('records call in mock.calls.getUsageStats', async () => {
      const keyIds = ['key-1', 'key-2']
      const query = { startTime: '2024-01-01', endTime: '2024-01-31' }
      await mock.getUsageStats(keyIds, query)
      expect(mock.calls.getUsageStats).toHaveLength(1)
      expect(mock.calls.getUsageStats[0].keyIds).toEqual(keyIds)
      expect(mock.calls.getUsageStats[0].query).toEqual(query)
    })
  })

  describe('getUsageLogs', () => {
    it('returns empty array when not seeded', async () => {
      const logs = await mock.getUsageLogs(['key-1'])
      expect(logs).toEqual([])
    })

    it('returns seeded logs after seedUsageLogs() is called', async () => {
      const seededLogs = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          keyId: 'key-1',
          model: 'gpt-4',
          provider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          latencyMs: 500,
          cost: 0.01,
          status: 'success' as const,
        },
      ]
      mock.seedUsageLogs(seededLogs)
      const logs = await mock.getUsageLogs(['key-1'])
      expect(logs).toHaveLength(1)
      expect(logs[0].keyId).toBe('key-1')
    })

    it('records call in mock.calls.getUsageLogs', async () => {
      const keyIds = ['key-1']
      await mock.getUsageLogs(keyIds)
      expect(mock.calls.getUsageLogs).toHaveLength(1)
      expect(mock.calls.getUsageLogs[0].keyIds).toEqual(keyIds)
    })
  })

  describe('calls getter', () => {
    it('returns readonly arrays tracking all invocations', async () => {
      await mock.createKey({ name: 'key-1' })
      await mock.createKey({ name: 'key-2' })
      expect(mock.calls.createKey).toHaveLength(2)
    })

    it('tracks all 5 methods independently', async () => {
      const created = await mock.createKey({ name: 'key-1' })
      await mock.updateKey(created.id, { isActive: false })
      await mock.deleteKey(created.id)
      await mock.getUsageStats([created.id])
      await mock.getUsageLogs([created.id])
      expect(mock.calls.createKey).toHaveLength(1)
      expect(mock.calls.updateKey).toHaveLength(1)
      expect(mock.calls.deleteKey).toHaveLength(1)
      expect(mock.calls.getUsageStats).toHaveLength(1)
      expect(mock.calls.getUsageLogs).toHaveLength(1)
    })
  })

  describe('failNext', () => {
    it('causes the next interface call to throw the queued error', async () => {
      const error = new GatewayError('rate limited', 'RATE_LIMITED', 429, true)
      mock.failNext(error)
      await expect(mock.createKey({ name: 'key-1' })).rejects.toThrow('rate limited')
    })

    it('after throwing, subsequent calls succeed normally (queue drains)', async () => {
      const error = new GatewayError('rate limited', 'RATE_LIMITED', 429, true)
      mock.failNext(error)
      await expect(mock.createKey({ name: 'key-fail' })).rejects.toThrow()
      // Next call should succeed
      const result = await mock.createKey({ name: 'key-ok' })
      expect(result.id).toBe('mock_vk_000001')
    })

    it('queues multiple errors FIFO', async () => {
      const error1 = new GatewayError('first error', 'RATE_LIMITED', 429, true)
      const error2 = new GatewayError('second error', 'NETWORK', 500, true)
      mock.failNext(error1)
      mock.failNext(error2)
      await expect(mock.createKey({ name: 'key-1' })).rejects.toThrow('first error')
      await expect(mock.createKey({ name: 'key-2' })).rejects.toThrow('second error')
      // Third call succeeds
      const result = await mock.createKey({ name: 'key-3' })
      expect(result.id).toBe('mock_vk_000001')
    })

    it('can fail any interface method (getUsageStats)', async () => {
      const error = new GatewayError('unauthorized', 'UNAUTHORIZED', 401, false)
      mock.failNext(error)
      await expect(mock.getUsageStats(['key-1'])).rejects.toThrow('unauthorized')
    })
  })

  describe('reset', () => {
    it('clears all keys from internal state', async () => {
      const created = await mock.createKey({ name: 'key-1' })
      mock.reset()
      // After reset, key should not exist
      await expect(mock.updateKey(created.id, { isActive: false })).rejects.toThrow(GatewayError)
    })

    it('resets ID counter so next createKey starts at mock_vk_000001 again', async () => {
      await mock.createKey({ name: 'key-1' })
      await mock.createKey({ name: 'key-2' })
      mock.reset()
      const result = await mock.createKey({ name: 'key-after-reset' })
      expect(result.id).toBe('mock_vk_000001')
    })

    it('clears all call records', async () => {
      await mock.createKey({ name: 'key-1' })
      mock.reset()
      expect(mock.calls.createKey).toHaveLength(0)
      expect(mock.calls.updateKey).toHaveLength(0)
      expect(mock.calls.deleteKey).toHaveLength(0)
      expect(mock.calls.getUsageStats).toHaveLength(0)
      expect(mock.calls.getUsageLogs).toHaveLength(0)
    })

    it('drains the fail queue on reset', async () => {
      mock.failNext(new GatewayError('err', 'UNKNOWN', 500, false))
      mock.reset()
      // After reset, this should succeed (not throw)
      const result = await mock.createKey({ name: 'key-1' })
      expect(result.id).toBe('mock_vk_000001')
    })

    it('clears seeded stats back to zero defaults', async () => {
      mock.seedUsageStats({ totalRequests: 100, totalCost: 1, totalTokens: 5000, avgLatency: 300 })
      mock.reset()
      const stats = await mock.getUsageStats(['key-1'])
      expect(stats.totalRequests).toBe(0)
    })

    it('clears seeded logs back to empty array', async () => {
      mock.seedUsageLogs([
        {
          timestamp: '2024-01-01T00:00:00Z',
          keyId: 'key-1',
          model: 'gpt-4',
          provider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          latencyMs: 500,
          cost: 0.01,
          status: 'success' as const,
        },
      ])
      mock.reset()
      const logs = await mock.getUsageLogs(['key-1'])
      expect(logs).toHaveLength(0)
    })
  })
})
