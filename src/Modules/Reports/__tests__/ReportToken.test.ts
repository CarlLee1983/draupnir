import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ReportToken } from '../Domain/ValueObjects/ReportToken'

describe('ReportToken', () => {
  const secret = 'test-secret-12345678901234567890123456789012' // 32 chars

  let originalSecret: string | undefined

  beforeEach(() => {
    originalSecret = process.env.REPORT_SIGNING_SECRET
    process.env.REPORT_SIGNING_SECRET = secret
  })

  afterEach(() => {
    process.env.REPORT_SIGNING_SECRET = originalSecret
  })

  it('should generate a valid signed token', async () => {
    const orgId = 'org-123'
    const expiresAt = new Date(Date.now() + 3600 * 1000)

    const token = await ReportToken.generate(orgId, expiresAt)
    expect(token).toBeDefined()
    expect(typeof token.value).toBe('string')
  })

  it('should verify a valid token', async () => {
    const orgId = 'org-123'
    const expiresAt = new Date(Date.now() + 3600 * 1000)

    const token = await ReportToken.generate(orgId, expiresAt)
    const result = await ReportToken.verify(token.value)

    expect(result).not.toBeNull()
    expect(result?.orgId).toBe(orgId)
  })

  it('should fail verification if token is expired', async () => {
    const orgId = 'org-123'
    const expiresAt = new Date(Date.now() - 3600 * 1000) // 1 hour ago

    const token = await ReportToken.generate(orgId, expiresAt)
    const result = await ReportToken.verify(token.value)

    expect(result).toBeNull()
  })

  it('should fail verification if token is tampered with', async () => {
    const orgId = 'org-123'
    const expiresAt = new Date(Date.now() + 3600 * 1000)

    const token = await ReportToken.generate(orgId, expiresAt)
    const tamperedValue =
      token.value.substring(0, token.value.length - 1) + (token.value.endsWith('a') ? 'b' : 'a')

    const result = await ReportToken.verify(tamperedValue)
    expect(result).toBeNull()
  })

  it('should fail verification for invalid format', async () => {
    const result = await ReportToken.verify('invalid.token.format')
    expect(result).toBeNull()
  })
})
