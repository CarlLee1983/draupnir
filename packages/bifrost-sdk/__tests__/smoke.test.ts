import { describe, it, expect } from 'bun:test'
import {
  BifrostClient,
  createBifrostClientConfig,
  BifrostApiError,
  isBifrostApiError,
  withRetry,
} from '../src'
import type { BifrostClientConfig } from '../src'

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
    expect(() => createBifrostClientConfig({ masterKey: 'test-key' })).toThrow(
      'BIFROST_API_URL is required',
    )
  })

  it('createBifrostClientConfig throws without masterKey', () => {
    expect(() =>
      createBifrostClientConfig({ baseUrl: 'https://test.example.com' }),
    ).toThrow('BIFROST_MASTER_KEY is required')
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

  it('BifrostClientConfig type is usable', () => {
    const config: BifrostClientConfig = {
      baseUrl: 'https://test.example.com',
      masterKey: 'test-key',
      timeoutMs: 5000,
      maxRetries: 1,
      retryBaseDelayMs: 100,
      proxyBaseUrl: 'https://test.example.com',
    }
    expect(config.baseUrl).toBe('https://test.example.com')
    expect(config.proxyBaseUrl).toBe('https://test.example.com')
  })
})
