import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import { BifrostApiError } from '@/Foundation/Infrastructure/Services/BifrostClient/errors'
import type { BifrostClientConfig } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClientConfig'
import type { VirtualKeyResponse, VirtualKeyListResponse, BifrostLogsResponse, BifrostModelsResponse } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

const TEST_CONFIG: BifrostClientConfig = {
  baseUrl: 'https://bifrost.test',
  masterKey: 'test-master-key',
  timeoutMs: 5000,
  maxRetries: 0,
  retryBaseDelayMs: 1,
}

function mockFetchResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('BifrostClient', () => {
  let client: BifrostClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    client = new BifrostClient(TEST_CONFIG)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('createVirtualKey', () => {
    it('should create a virtual key', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'Virtual key created',
        virtual_key: { id: 'vk-123', name: 'test-key', value: 'bifrost_vk_xxx', is_active: true, provider_configs: [] },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.createVirtualKey({ name: 'test-key' })

      expect(result.id).toBe('vk-123')
      expect(result.name).toBe('test-key')
      expect(result.value).toBe('bifrost_vk_xxx')

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys')
      expect(fetchCall[1].method).toBe('POST')
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-master-key')
    })
  })

  describe('listVirtualKeys', () => {
    it('should list virtual keys', async () => {
      const mockResponse: VirtualKeyListResponse = {
        virtual_keys: [
          { id: 'vk-1', name: 'key-1', is_active: true, provider_configs: [] },
          { id: 'vk-2', name: 'key-2', is_active: false, provider_configs: [] },
        ],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.listVirtualKeys()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('vk-1')
    })
  })

  describe('getVirtualKey', () => {
    it('should get a virtual key by ID', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'ok',
        virtual_key: { id: 'vk-1', name: 'key-1', is_active: true, provider_configs: [] },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.getVirtualKey('vk-1')

      expect(result.id).toBe('vk-1')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys/vk-1')
    })

    it('should throw BifrostApiError on 404', async () => {
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(404, { error: 'not found' })))

      try {
        await client.getVirtualKey('vk-nonexistent')
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof BifrostApiError).toBe(true)
        expect((error as BifrostApiError).status).toBe(404)
      }
    })
  })

  describe('updateVirtualKey', () => {
    it('should update a virtual key', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'updated',
        virtual_key: { id: 'vk-1', name: 'updated-key', is_active: true, provider_configs: [] },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.updateVirtualKey('vk-1', { name: 'updated-key' })

      expect(result.name).toBe('updated-key')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('PUT')
    })
  })

  describe('deleteVirtualKey', () => {
    it('should delete a virtual key', async () => {
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, { message: 'deleted' })))

      await client.deleteVirtualKey('vk-1')

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('DELETE')
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys/vk-1')
    })
  })

  describe('getLogs', () => {
    it('should fetch logs with query params', async () => {
      const mockResponse: BifrostLogsResponse = {
        logs: [{
          id: 'log-1', provider: 'openai', model: 'gpt-4', status: 'success',
          object: 'chat.completion', timestamp: '2026-04-08T00:00:00Z', latency: 1.0, cost: 0.02,
        }],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.getLogs({ virtual_key_ids: 'vk-1', limit: 100 })

      expect(result.logs).toHaveLength(1)
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).toContain('virtual_key_ids=vk-1')
      expect(url).toContain('limit=100')
    })
  })

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockResponse: BifrostModelsResponse = {
        data: [
          { id: 'openai/gpt-4', name: 'GPT-4', context_length: 128000 },
          { id: 'anthropic/claude-3', name: 'Claude 3', context_length: 200000 },
        ],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.listModels()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('openai/gpt-4')
    })
  })

  describe('request headers', () => {
    it('should include Authorization and Content-Type headers', async () => {
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, { virtual_keys: [] })))

      await client.listVirtualKeys()

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-master-key')
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
    })
  })
})
