import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type {
  BifrostClientConfig,
  BifrostLogsResponse,
  BifrostLogsStats,
  TeamListResponse,
  TeamResponse,
  VirtualKeyResponse,
} from '@draupnir/bifrost-sdk'
import { BifrostApiError, BifrostClient } from '@draupnir/bifrost-sdk'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway/errors'
import { BifrostGatewayAdapter } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter'

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

describe('BifrostGatewayAdapter', () => {
  let adapter: BifrostGatewayAdapter
  let bifrostClient: BifrostClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    bifrostClient = new BifrostClient(TEST_CONFIG)
    adapter = new BifrostGatewayAdapter(bifrostClient)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('ensureTeam', () => {
    it('returns the existing team when name matches', async () => {
      const listResponse: TeamListResponse = {
        teams: [{ id: 'team-1', name: 'org-1', customer_id: 'cust-1', budget_id: 'budget-1' }],
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, listResponse))) as any

      const team = await adapter.ensureTeam({ name: 'org-1' })

      expect(team).toEqual({
        id: 'team-1',
        name: 'org-1',
        customerId: 'cust-1',
        budgetId: 'budget-1',
      })
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      expect((globalThis.fetch as any).mock.calls).toHaveLength(1)
    })

    it('creates a new team when no match exists', async () => {
      const listResponse: TeamListResponse = { teams: [] }
      const createResponse: TeamResponse = {
        message: 'created',
        team: { id: 'team-2', name: 'org-2', customer_id: 'cust-2' },
      }
      globalThis.fetch = mock((_url: string, init: RequestInit) => {
        if (init.method === 'GET') return Promise.resolve(mockFetchResponse(200, listResponse))
        if (init.method === 'POST') return Promise.resolve(mockFetchResponse(200, createResponse))
        throw new Error(`unexpected method: ${init.method}`)
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      }) as any

      const team = await adapter.ensureTeam({
        name: 'org-2',
        customerId: 'cust-2',
        budget: { maxLimit: 100, resetDuration: '30d', calendarAligned: true },
      })

      expect(team.id).toBe('team-2')

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const postCall = (globalThis.fetch as any).mock.calls.find(
        // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
        (call: any[]) => call[1]?.method === 'POST',
      )
      const body = JSON.parse(postCall[1].body)
      expect(body).toEqual({
        name: 'org-2',
        customer_id: 'cust-2',
        budget: { max_limit: 100, reset_duration: '30d', calendar_aligned: true },
      })
    })
  })

  // ============================================================
  // createKey
  // ============================================================

  describe('createKey', () => {
    it('should map camelCase request to snake_case Bifrost body', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'created',
        virtual_key: {
          id: 'vk-1',
          name: 'test',
          value: 'raw_key',
          is_active: true,
          provider_configs: [],
        },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      await adapter.createKey({
        name: 'test',
        customerId: 'c1',
        isActive: true,
        budget: { maxLimit: 100, resetDuration: '30d', calendarAligned: true },
        rateLimit: { tokenMaxLimit: 1000, tokenResetDuration: '1m' },
        providerConfigs: [{ provider: '*', allowedModels: ['gpt-4'] }],
      })

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.name).toBe('test')
      expect(body.customer_id).toBe('c1')
      expect(body.is_active).toBe(true)
      expect(body.budget).toEqual({
        max_limit: 100,
        reset_duration: '30d',
        calendar_aligned: true,
      })
      expect(body.rate_limit).toEqual({ token_max_limit: 1000, token_reset_duration: '1m' })
      expect(body.provider_configs).toEqual([{ provider: '*', allowed_models: ['gpt-4'] }])
    })

    it('should map Bifrost response to camelCase KeyResponse', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'created',
        virtual_key: {
          id: 'vk-1',
          name: 'test',
          value: 'raw_key',
          is_active: true,
          provider_configs: [],
        },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await adapter.createKey({ name: 'test' })

      expect(result.id).toBe('vk-1')
      expect(result.name).toBe('test')
      expect(result.value).toBe('raw_key')
      expect(result.isActive).toBe(true)
    })

    it('should omit provider_configs and other optional fields when not provided', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'created',
        virtual_key: { id: 'vk-1', name: 'test', is_active: true, provider_configs: [] },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      await adapter.createKey({ name: 'test' })

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.name).toBe('test')
      expect('provider_configs' in body).toBe(false)
      expect('key_ids' in body).toBe(false)
      expect('customer_id' in body).toBe(false)
      expect('is_active' in body).toBe(false)
      expect('budget' in body).toBe(false)
      expect('rate_limit' in body).toBe(false)
    })
  })

  // ============================================================
  // updateKey — undefined field exclusion
  // ============================================================

  describe('updateKey', () => {
    it('should only include is_active when only isActive is provided', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'updated',
        virtual_key: { id: 'vk-1', name: 'test', is_active: true, provider_configs: [] },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      await adapter.updateKey('vk-1', { isActive: true })

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.is_active).toBe(true)
      expect('budget' in body).toBe(false)
      expect('rate_limit' in body).toBe(false)
      expect('provider_configs' in body).toBe(false)
    })

    it('should only include budget when only budget is provided', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'updated',
        virtual_key: { id: 'vk-1', name: 'test', is_active: true, provider_configs: [] },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      await adapter.updateKey('vk-1', {
        budget: { maxLimit: 50, resetDuration: '720h' },
      })

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.budget).toEqual({ max_limit: 50, reset_duration: '720h' })
      expect('calendar_aligned' in body.budget).toBe(false)
      expect('is_active' in body).toBe(false)
      expect('rate_limit' in body).toBe(false)
      expect('provider_configs' in body).toBe(false)
    })

    it('should only include rate_limit when only rateLimit is provided', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'updated',
        virtual_key: { id: 'vk-1', name: 'test', is_active: true, provider_configs: [] },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      await adapter.updateKey('vk-1', { rateLimit: { tokenMaxLimit: 500 } })

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.rate_limit).toBeDefined()
      expect(body.rate_limit.token_max_limit).toBe(500)
      expect('budget' in body).toBe(false)
      expect('is_active' in body).toBe(false)
      expect('provider_configs' in body).toBe(false)
    })

    it('should map response to camelCase KeyResponse', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'updated',
        virtual_key: { id: 'vk-1', name: 'updated', is_active: false, provider_configs: [] },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await adapter.updateKey('vk-1', { isActive: false })

      expect(result.id).toBe('vk-1')
      expect(result.isActive).toBe(false)
    })

    it('should map providerConfigs.allowedModels to allowed_models', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'updated',
        virtual_key: { id: 'vk-1', name: 'updated', is_active: false, provider_configs: [] },
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      await adapter.updateKey('vk-1', {
        providerConfigs: [{ provider: 'openai', allowedModels: ['gpt-4', 'gpt-4o'] }],
      })

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.provider_configs).toEqual([
        { provider: 'openai', allowed_models: ['gpt-4', 'gpt-4o'] },
      ])
    })
  })

  // ============================================================
  // deleteKey
  // ============================================================

  describe('deleteKey', () => {
    it('should call deleteVirtualKey with the given keyId', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(200, { message: 'deleted' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      await adapter.deleteKey('vk-1')

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toContain('/vk-1')
      expect(fetchCall[1].method).toBe('DELETE')
    })
  })

  // ============================================================
  // getUsageStats
  // ============================================================

  describe('getUsageStats', () => {
    it('should join keyIds with comma for virtual_key_ids param', async () => {
      const mockStats: BifrostLogsStats = {
        total_requests: 100,
        total_cost: 5.5,
        total_tokens: 50000,
        avg_latency: 200,
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockStats))) as any

      await adapter.getUsageStats(['vk-1', 'vk-2'], {
        startTime: '2024-01-01',
        endTime: '2024-12-31',
      })

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).toContain('virtual_key_ids=vk-1%2Cvk-2')
      expect(url).toContain('start_time=2024-01-01')
      expect(url).toContain('end_time=2024-12-31')
    })

    it('should map Bifrost stats to camelCase UsageStats', async () => {
      const mockStats: BifrostLogsStats = {
        total_requests: 100,
        total_cost: 5.5,
        total_tokens: 50000,
        avg_latency: 200,
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockStats))) as any

      const result = await adapter.getUsageStats(['vk-1'])

      expect(result.totalRequests).toBe(100)
      expect(result.totalCost).toBe(5.5)
      expect(result.totalTokens).toBe(50000)
      expect(result.avgLatency).toBe(200)
    })

    it('should omit start_time and end_time when query is undefined', async () => {
      const mockStats: BifrostLogsStats = {
        total_requests: 0,
        total_cost: 0,
        total_tokens: 0,
        avg_latency: 0,
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockStats))) as any

      await adapter.getUsageStats(['vk-1'])

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).not.toContain('start_time')
      expect(url).not.toContain('end_time')
    })
  })

  // ============================================================
  // getUsageLogs
  // ============================================================

  describe('getUsageLogs', () => {
    it('should join keyIds and map log entries to camelCase LogEntry', async () => {
      const mockResponse: BifrostLogsResponse = {
        logs: [
          {
            id: 'log-1',
            virtual_key_id: 'vk-1',
            model: 'gpt-4',
            provider: 'openai',
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
            latency: 1.5,
            cost: 0.01,
            timestamp: '2024-01-01T00:00:00Z',
            status: 'success',
            object: 'chat.completion',
          },
        ],
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await adapter.getUsageLogs(['vk-1'])

      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const url = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(url).toContain('virtual_key_ids=vk-1')
      expect(result).toHaveLength(1)
      const entry = result[0]
      expect(entry.keyId).toBe('vk-1')
      expect(entry.model).toBe('gpt-4')
      expect(entry.provider).toBe('openai')
      expect(entry.inputTokens).toBe(100)
      expect(entry.outputTokens).toBe(50)
      expect(entry.totalTokens).toBe(150)
      expect(entry.latencyMs).toBe(1.5)
      expect(entry.cost).toBe(0.01)
      expect(entry.timestamp).toBe('2024-01-01T00:00:00Z')
      expect(entry.status).toBe('success')
    })

    it('should map status "processing" to "error" (conservative)', async () => {
      const mockResponse: BifrostLogsResponse = {
        logs: [
          {
            id: 'log-2',
            model: 'gpt-4',
            provider: 'openai',
            latency: 0,
            cost: 0,
            timestamp: '2024-01-01T00:00:00Z',
            status: 'processing',
            object: 'chat.completion',
          },
        ],
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await adapter.getUsageLogs(['vk-1'])

      expect(result[0].status).toBe('error')
    })

    it('should default keyId to empty string when virtual_key_id is undefined', async () => {
      const mockResponse: BifrostLogsResponse = {
        logs: [
          {
            id: 'log-3',
            model: 'gpt-4',
            provider: 'openai',
            latency: 0,
            cost: 0,
            timestamp: '2024-01-01T00:00:00Z',
            status: 'success',
            object: 'chat.completion',
          },
        ],
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await adapter.getUsageLogs(['vk-1'])

      expect(result[0].keyId).toBe('')
    })

    it('should default inputTokens to 0 when input_tokens is undefined', async () => {
      const mockResponse: BifrostLogsResponse = {
        logs: [
          {
            id: 'log-4',
            virtual_key_id: 'vk-1',
            model: 'gpt-4',
            provider: 'openai',
            latency: 0,
            cost: 0,
            timestamp: '2024-01-01T00:00:00Z',
            status: 'success',
            object: 'chat.completion',
          },
        ],
      }
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

      const result = await adapter.getUsageLogs(['vk-1'])

      expect(result[0].inputTokens).toBe(0)
      expect(result[0].outputTokens).toBe(0)
      expect(result[0].totalTokens).toBe(0)
    })
  })

  // ============================================================
  // Error translation
  // ============================================================

  describe('error translation', () => {
    it('should translate BifrostApiError 404 to GatewayError NOT_FOUND (retryable: false)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(404, { error: 'not found' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.getUsageStats(['vk-1'])
        expect(true).toBe(false) // should not reach here
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('NOT_FOUND')
        expect((error as GatewayError).retryable).toBe(false)
        expect((error as GatewayError).statusCode).toBe(404)
      }
    })

    it('should translate BifrostApiError 401 to GatewayError UNAUTHORIZED (retryable: false)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(401, { error: 'unauthorized' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.createKey({ name: 'test' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('UNAUTHORIZED')
        expect((error as GatewayError).retryable).toBe(false)
      }
    })

    it('should translate BifrostApiError 403 to GatewayError UNAUTHORIZED (retryable: false)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(403, { error: 'forbidden' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.deleteKey('vk-1')
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('UNAUTHORIZED')
        expect((error as GatewayError).retryable).toBe(false)
      }
    })

    it('should translate BifrostApiError 422 to GatewayError VALIDATION (retryable: false)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(422, { error: 'validation error' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.createKey({ name: 'test' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('VALIDATION')
        expect((error as GatewayError).retryable).toBe(false)
      }
    })

    it('should translate BifrostApiError 400 to GatewayError VALIDATION (retryable: false)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(400, { error: 'bad request' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.updateKey('vk-1', { isActive: true })
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('VALIDATION')
        expect((error as GatewayError).retryable).toBe(false)
      }
    })

    it('should translate BifrostApiError 429 to GatewayError RATE_LIMITED (retryable: true)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(429, { error: 'too many requests' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.createKey({ name: 'test' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('RATE_LIMITED')
        expect((error as GatewayError).retryable).toBe(true)
      }
    })

    it('should translate BifrostApiError 502 to GatewayError NETWORK (retryable: true)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(502, { error: 'bad gateway' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.getUsageLogs(['vk-1'])
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('NETWORK')
        expect((error as GatewayError).retryable).toBe(true)
      }
    })

    it('should translate BifrostApiError 503 to GatewayError NETWORK (retryable: true)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(503, { error: 'service unavailable' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.getUsageLogs(['vk-1'])
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('NETWORK')
        expect((error as GatewayError).retryable).toBe(true)
      }
    })

    it('should translate BifrostApiError 504 to GatewayError NETWORK (retryable: true)', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(504, { error: 'gateway timeout' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.getUsageLogs(['vk-1'])
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('NETWORK')
        expect((error as GatewayError).retryable).toBe(true)
      }
    })

    it('should translate TypeError (fetch failure) to GatewayError NETWORK (retryable: true)', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.reject(new TypeError('fetch failed'))) as any

      try {
        await adapter.createKey({ name: 'test' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('NETWORK')
        expect((error as GatewayError).retryable).toBe(true)
      }
    })

    it('should translate unknown error to GatewayError UNKNOWN (retryable: false)', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      globalThis.fetch = mock(() => Promise.reject(new Error('unknown failure'))) as any

      try {
        await adapter.deleteKey('vk-1')
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).code).toBe('UNKNOWN')
        expect((error as GatewayError).retryable).toBe(false)
      }
    })

    it('should preserve originalError in GatewayError', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(404, { error: 'not found' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      ) as any

      try {
        await adapter.deleteKey('vk-missing')
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof GatewayError).toBe(true)
        expect((error as GatewayError).originalError).toBeInstanceOf(BifrostApiError)
      }
    })
  })
})
