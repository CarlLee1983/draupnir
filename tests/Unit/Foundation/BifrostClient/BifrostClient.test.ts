import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type {
  BifrostClientConfig,
  BifrostLogsResponse,
  BifrostLogsStats,
  BifrostModelsResponse,
  TeamListResponse,
  TeamResponse,
  VirtualKeyListResponse,
  VirtualKeyResponse,
} from '@draupnir/bifrost-sdk'
import { BifrostApiError, BifrostClient } from '@draupnir/bifrost-sdk'

const TEST_CONFIG: BifrostClientConfig = {
  baseUrl: 'https://bifrost.test',
  masterKey: 'test-master-key',
  timeoutMs: 5000,
  maxRetries: 0,
  retryBaseDelayMs: 1,
  proxyBaseUrl: 'https://bifrost.test',
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
        virtual_key: {
          id: 'vk-123',
          name: 'test-key',
          value: 'bifrost_vk_xxx',
          is_active: true,
          provider_configs: [],
        },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

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
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

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
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.getVirtualKey('vk-1')

      expect(result.id).toBe('vk-1')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys/vk-1')
    })

    it('should throw BifrostApiError on 404', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(404, { error: 'not found' })),
      ) as any

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
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.updateVirtualKey('vk-1', { name: 'updated-key' })

      expect(result.name).toBe('updated-key')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('PUT')
    })
  })

  describe('deleteVirtualKey', () => {
    it('should delete a virtual key', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(200, { message: 'deleted' })),
      ) as any

      await client.deleteVirtualKey('vk-1')

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('DELETE')
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys/vk-1')
    })
  })

  describe('getLogs', () => {
    it('should fetch logs with query params', async () => {
      const mockResponse: BifrostLogsResponse = {
        logs: [
          {
            id: 'log-1',
            provider: 'openai',
            model: 'gpt-4',
            status: 'success',
            object: 'chat.completion',
            timestamp: '2026-04-08T00:00:00Z',
            latency: 1.0,
            cost: 0.02,
          },
        ],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.getLogs({ virtual_key_ids: 'vk-1', limit: 100 })

      expect(result.logs).toHaveLength(1)
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).toContain('virtual_key_ids=vk-1')
      expect(url).toContain('limit=100')
    })
  })

  describe('getLogsStats', () => {
    it('should fetch usage summary stats', async () => {
      const mockResponse: BifrostLogsStats = {
        total_requests: 150,
        total_cost: 3.45,
        total_tokens: 50000,
        avg_latency: 0.8,
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.getLogsStats({ virtual_key_ids: 'vk-1' })

      expect(result.total_requests).toBe(150)
      expect(result.total_cost).toBe(3.45)
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).toContain('/api/logs/stats')
      expect(url).toContain('virtual_key_ids=vk-1')
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
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.listModels()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('openai/gpt-4')
    })
  })

  describe('teams', () => {
    it('should create a team', async () => {
      const mockResponse: TeamResponse = {
        message: 'created',
        team: { id: 'team-1', name: 'org-1' },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.createTeam({ name: 'org-1' })

      expect(result.id).toBe('team-1')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/teams')
      expect(fetchCall[1].method).toBe('POST')
    })

    it('should list teams with optional query params', async () => {
      const mockResponse: TeamListResponse = {
        teams: [{ id: 'team-1', name: 'org-1' }],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.listTeams({ customer_id: 'cust-1', from_memory: true })

      expect(result).toHaveLength(1)
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).toContain('/api/governance/teams?')
      expect(url).toContain('customer_id=cust-1')
      expect(url).toContain('from_memory=true')
    })

    it('should list teams without query params', async () => {
      const mockResponse: TeamListResponse = {
        teams: [{ id: 'team-1', name: 'org-1' }],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await client.listTeams()

      expect(result).toHaveLength(1)
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).toBe('https://bifrost.test/api/governance/teams')
    })

    it('should get and update a team by ID', async () => {
      const getResponse: TeamResponse = {
        message: 'ok',
        team: { id: 'team-1', name: 'org-1' },
      }
      const updateResponse: TeamResponse = {
        message: 'updated',
        team: { id: 'team-1', name: 'org-1-updated' },
      }
      globalThis.fetch = mock((_url: string, init: RequestInit) => {
        if (init.method === 'GET') return Promise.resolve(mockFetchResponse(200, getResponse))
        if (init.method === 'PUT') return Promise.resolve(mockFetchResponse(200, updateResponse))
        throw new Error(`unexpected method: ${init.method}`)
      }) as any

      const team = await client.getTeam('team-1')
      expect(team.name).toBe('org-1')

      const updated = await client.updateTeam('team-1', { name: 'org-1-updated' })
      expect(updated.name).toBe('org-1-updated')
    })

    it('should delete a team', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(200, { message: 'ok' })),
      ) as any

      await client.deleteTeam('team-1')

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('DELETE')
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/teams/team-1')
    })
  })

  describe('request headers', () => {
    it('should include Authorization and Content-Type headers', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(200, { virtual_keys: [] })),
      ) as any

      await client.listVirtualKeys()

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-master-key')
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
    })

    it('should omit Authorization when masterKey is unset', async () => {
      const noAuthClient = new BifrostClient({
        baseUrl: 'https://bifrost.test',
        timeoutMs: 5000,
        maxRetries: 0,
        retryBaseDelayMs: 1,
        proxyBaseUrl: 'https://bifrost.test',
      })
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(200, { virtual_keys: [] })),
      ) as any

      await noAuthClient.listVirtualKeys()

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].headers['Authorization']).toBeUndefined()
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
    })
  })
})
