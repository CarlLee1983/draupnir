// src/Modules/CliApi/__tests__/CliApiConfig.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadCliApiConfig } from '../Infrastructure/Config/CliApiConfig'

describe('loadCliApiConfig', () => {
  const envKeys = [
    'DEVICE_CODE_TTL_SECONDS',
    'CLI_POLLING_INTERVAL_SECONDS',
    'CLI_VERIFICATION_URI',
    'VERIFICATION_URI',
    'DEVICE_CODE_STORE_TYPE',
  ] as const

  beforeEach(() => {
    for (const k of envKeys) {
      delete process.env[k]
    }
  })

  afterEach(() => {
    for (const k of envKeys) {
      delete process.env[k]
    }
  })

  it('uses defaults when env is empty', () => {
    const c = loadCliApiConfig()
    expect(c.deviceCodeTtlSeconds).toBe(600)
    expect(c.pollingIntervalSeconds).toBe(5)
    expect(c.verificationUri).toBe('http://localhost:3000/cli/verify')
  })

  it('reads overrides from env', () => {
    process.env.DEVICE_CODE_TTL_SECONDS = '120'
    process.env.CLI_POLLING_INTERVAL_SECONDS = '3'
    process.env.CLI_VERIFICATION_URI = 'https://example.com/verify'

    const c = loadCliApiConfig()
    expect(c.deviceCodeTtlSeconds).toBe(120)
    expect(c.pollingIntervalSeconds).toBe(3)
    expect(c.verificationUri).toBe('https://example.com/verify')
  })

  it('throws when store type is not memory', () => {
    process.env.DEVICE_CODE_STORE_TYPE = 'redis'
    expect(() => loadCliApiConfig()).toThrow(/not supported/)
  })
})
