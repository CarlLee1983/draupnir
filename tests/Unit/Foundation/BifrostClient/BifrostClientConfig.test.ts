import { afterEach, describe, expect, it } from 'bun:test'
import { createBifrostClientConfig } from '@draupnir/bifrost-sdk'

const ORIGINAL_ENV = {
  BIFROST_API_URL: process.env.BIFROST_API_URL,
  BIFROST_MASTER_KEY: process.env.BIFROST_MASTER_KEY,
}

afterEach(() => {
  process.env.BIFROST_API_URL = ORIGINAL_ENV.BIFROST_API_URL
  process.env.BIFROST_MASTER_KEY = ORIGINAL_ENV.BIFROST_MASTER_KEY
})

describe('createBifrostClientConfig', () => {
  it('throws when baseUrl is missing from overrides and env', () => {
    delete process.env.BIFROST_API_URL
    delete process.env.BIFROST_MASTER_KEY

    expect(() => createBifrostClientConfig()).toThrow(
      'BIFROST_API_URL is required. Set it in .env or pass baseUrl in config.',
    )
  })

  it('fills defaults from env vars and normalizes the URL', () => {
    process.env.BIFROST_API_URL = 'https://gateway.example.com///'
    process.env.BIFROST_MASTER_KEY = '  sk-test  '

    const config = createBifrostClientConfig()

    expect(config.baseUrl).toBe('https://gateway.example.com')
    expect(config.proxyBaseUrl).toBe('https://gateway.example.com')
    expect(config.masterKey).toBe('sk-test')
    expect(config.timeoutMs).toBe(30_000)
    expect(config.maxRetries).toBe(3)
    expect(config.retryBaseDelayMs).toBe(500)
  })

  it('treats empty master key as undefined', () => {
    process.env.BIFROST_API_URL = 'https://gateway.example.com'
    process.env.BIFROST_MASTER_KEY = '   '

    const config = createBifrostClientConfig()

    expect(config.masterKey).toBeUndefined()
  })
})

