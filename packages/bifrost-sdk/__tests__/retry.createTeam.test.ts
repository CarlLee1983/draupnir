import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { BifrostClient } from '../src'

describe('BifrostClient.createTeam retry behavior', () => {
  let fetchCalls: number
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    fetchCalls = 0
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mkClient() {
    return new BifrostClient({
      baseUrl: 'https://bifrost.example.com',
      masterKey: 'k',
      timeoutMs: 1_000,
      maxRetries: 3,
      retryBaseDelayMs: 1,
      proxyBaseUrl: 'https://bifrost.example.com',
    })
  }

  it('createTeam does NOT retry on 503', async () => {
    globalThis.fetch = mock(async () => {
      fetchCalls++
      return new Response('{"error":"upstream down"}', {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    const client = mkClient()
    await expect(client.createTeam({ name: 'org-1' })).rejects.toThrow()
    expect(fetchCalls).toBe(1)
  })

  it('createVirtualKey still retries on 503', async () => {
    globalThis.fetch = mock(async () => {
      fetchCalls++
      return new Response('{"error":"upstream down"}', {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    const client = mkClient()
    await expect(client.createVirtualKey({ name: 'k' })).rejects.toThrow()
    expect(fetchCalls).toBeGreaterThan(1)
  })
})
