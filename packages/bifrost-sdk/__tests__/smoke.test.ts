import { describe, expect, it } from 'bun:test'
import type { BifrostClientConfig } from '../src'
import {
  BifrostApiError,
  BifrostClient,
  createBifrostClientConfig,
  isBifrostApiError,
  withRetry,
} from '../src'

describe('@draupnir/bifrost-sdk smoke', () => {
  it('exports BifrostClient constructor', () => {
    expect(BifrostClient).toBeDefined()
    expect(typeof BifrostClient).toBe('function')
  })

  it('createBifrostClientConfig returns valid config with defaults', () => {
    const config = createBifrostClientConfig({
      baseUrl: 'https://test.example.com',
      masterKey: 'test-key',
    })
    expect(config.baseUrl).toBe('https://test.example.com')
    expect(config.masterKey).toBe('test-key')
    expect(config.timeoutMs).toBe(30_000)
    expect(config.maxRetries).toBe(3)
    expect(config.retryBaseDelayMs).toBe(500)
  })

  it('createBifrostClientConfig includes proxyBaseUrl defaulting to baseUrl', () => {
    const config = createBifrostClientConfig({
      baseUrl: 'https://test.example.com',
      masterKey: 'test-key',
    })
    expect(config.proxyBaseUrl).toBe('https://test.example.com')
  })

  it('createBifrostClientConfig accepts custom proxyBaseUrl', () => {
    const config = createBifrostClientConfig({
      baseUrl: 'https://test.example.com',
      masterKey: 'test-key',
      proxyBaseUrl: 'https://proxy.example.com',
    })
    expect(config.proxyBaseUrl).toBe('https://proxy.example.com')
  })

  it('createBifrostClientConfig strips trailing slashes from baseUrl', () => {
    const config = createBifrostClientConfig({
      baseUrl: 'https://test.example.com///',
      masterKey: 'test-key',
    })
    expect(config.baseUrl).toBe('https://test.example.com')
    expect(config.proxyBaseUrl).toBe('https://test.example.com')
  })

  it('createBifrostClientConfig throws without baseUrl', () => {
    const originalBaseUrl = process.env.BIFROST_API_URL
    const originalMasterKey = process.env.BIFROST_MASTER_KEY
    delete process.env.BIFROST_API_URL
    delete process.env.BIFROST_MASTER_KEY

    try {
      expect(() => createBifrostClientConfig({ masterKey: 'test-key' })).toThrow(
        'BIFROST_API_URL is required',
      )
    } finally {
      if (originalBaseUrl !== undefined) {
        process.env.BIFROST_API_URL = originalBaseUrl
      } else {
        delete process.env.BIFROST_API_URL
      }
      if (originalMasterKey !== undefined) {
        process.env.BIFROST_MASTER_KEY = originalMasterKey
      } else {
        delete process.env.BIFROST_MASTER_KEY
      }
    }
  })

  it('createBifrostClientConfig omits masterKey when unset', () => {
    const originalBaseUrl = process.env.BIFROST_API_URL
    const originalMasterKey = process.env.BIFROST_MASTER_KEY
    delete process.env.BIFROST_API_URL
    delete process.env.BIFROST_MASTER_KEY

    try {
      const config = createBifrostClientConfig({ baseUrl: 'https://test.example.com' })
      expect(config.masterKey).toBeUndefined()
      expect('masterKey' in config).toBe(false)
    } finally {
      if (originalBaseUrl !== undefined) {
        process.env.BIFROST_API_URL = originalBaseUrl
      } else {
        delete process.env.BIFROST_API_URL
      }
      if (originalMasterKey !== undefined) {
        process.env.BIFROST_MASTER_KEY = originalMasterKey
      } else {
        delete process.env.BIFROST_MASTER_KEY
      }
    }
  })

  it('BifrostApiError is constructable with correct properties', () => {
    const error = new BifrostApiError(500, '/test', 'server error')
    expect(error.status).toBe(500)
    expect(error.endpoint).toBe('/test')
    expect(error.isRetryable).toBe(true)
    expect(error.name).toBe('BifrostApiError')
  })

  it('isBifrostApiError identifies BifrostApiError instances', () => {
    const error = new BifrostApiError(404, '/test', 'not found')
    expect(isBifrostApiError(error)).toBe(true)
    expect(isBifrostApiError(new Error('generic'))).toBe(false)
  })

  it('withRetry is a callable function', () => {
    expect(typeof withRetry).toBe('function')
  })

  it('BifrostClient exposes Team CRUD methods', () => {
    const client = new BifrostClient({
      baseUrl: 'https://test.example.com',
      timeoutMs: 5000,
      maxRetries: 1,
      retryBaseDelayMs: 100,
      proxyBaseUrl: 'https://test.example.com',
    })
    expect(typeof client.createTeam).toBe('function')
    expect(typeof client.listTeams).toBe('function')
    expect(typeof client.getTeam).toBe('function')
    expect(typeof client.updateTeam).toBe('function')
    expect(typeof client.deleteTeam).toBe('function')
  })

  it('BifrostClientConfig type is usable with optional masterKey', () => {
    const config: BifrostClientConfig = {
      baseUrl: 'https://test.example.com',
      timeoutMs: 5000,
      maxRetries: 1,
      retryBaseDelayMs: 100,
      proxyBaseUrl: 'https://test.example.com',
    }
    expect(config.baseUrl).toBe('https://test.example.com')
    expect(config.proxyBaseUrl).toBe('https://test.example.com')
    expect(config.masterKey).toBeUndefined()
  })
})
