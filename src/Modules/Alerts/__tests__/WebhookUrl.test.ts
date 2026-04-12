import { describe, expect, it, vi, beforeEach } from 'vitest'
import { lookup } from 'node:dns/promises'
import { WebhookUrl } from '../Domain/ValueObjects/WebhookUrl'

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}))

const mockedLookup = lookup as unknown as ReturnType<typeof vi.fn>

describe('WebhookUrl', () => {
  beforeEach(() => {
    mockedLookup.mockReset()
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  })

  it('accepts HTTPS URLs and normalizes the value', async () => {
    const url = await WebhookUrl.create('https://example.com/hook')

    expect(url.value).toBe('https://example.com/hook')
  })

  it('rejects non-HTTPS URLs unless explicitly allowed', async () => {
    await expect(WebhookUrl.create('http://example.com/hook')).rejects.toThrow(
      'Webhook URL must use HTTPS',
    )

    mockedLookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
    const url = await WebhookUrl.create('http://example.com/hook', true)
    expect(url.value).toBe('http://example.com/hook')
  })

  it('rejects localhost and private IP literals', async () => {
    await expect(WebhookUrl.create('https://localhost/hook')).rejects.toThrow(
      'SSRF: localhost rejected',
    )
    await expect(WebhookUrl.create('https://127.0.0.1/hook')).rejects.toThrow(/SSRF/)
    await expect(WebhookUrl.create('https://10.0.0.5/hook')).rejects.toThrow(/SSRF/)
    await expect(WebhookUrl.create('https://192.168.1.1/hook')).rejects.toThrow(/SSRF/)
    await expect(WebhookUrl.create('https://169.254.169.254/hook')).rejects.toThrow(/SSRF/)
  })

  it('rejects DNS failures', async () => {
    mockedLookup.mockRejectedValueOnce(new Error('not found'))

    await expect(WebhookUrl.create('https://nonexistent-xyz.invalid/hook')).rejects.toThrow(
      'SSRF: DNS resolution failed',
    )
  })

  it('rejects hostnames that resolve to private IPs', async () => {
    mockedLookup.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }])

    await expect(WebhookUrl.create('https://private.example/hook')).rejects.toThrow(/SSRF/)
    expect(mockedLookup).toHaveBeenCalledWith('private.example', { all: true })
  })

  it('rejects IPv6 private and loopback ranges', async () => {
    mockedLookup.mockResolvedValueOnce([{ address: '::1', family: 6 }])
    await expect(WebhookUrl.create('https://ipv6.example/hook')).rejects.toThrow(/SSRF/)
  })
})
