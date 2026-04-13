import { lookup } from 'node:dns/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterWebhookEndpointService } from '../Application/Services/RegisterWebhookEndpointService'
import type { IWebhookEndpointRepository } from '../Domain/Repositories/IWebhookEndpointRepository'

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}))

const mockedLookup = lookup as unknown as ReturnType<typeof vi.fn>

describe('RegisterWebhookEndpointService', () => {
  let repo: IWebhookEndpointRepository & {
    countByOrg: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockedLookup.mockReset()
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    repo = {
      countByOrg: vi.fn(),
      save: vi.fn(),
      findById: vi.fn(),
      findByOrg: vi.fn(),
      findActiveByOrg: vi.fn(),
      delete: vi.fn(),
    } as never
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects when the organization already has five endpoints', async () => {
    repo.countByOrg.mockResolvedValue(5)
    const service = new RegisterWebhookEndpointService({ repo })

    await expect(service.register('org-1', 'https://example.com/hook')).rejects.toThrow(
      'Maximum 5 webhook endpoints per organization',
    )
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('propagates SSRF validation errors before persistence', async () => {
    repo.countByOrg.mockResolvedValue(0)
    mockedLookup.mockRejectedValueOnce(new Error('not found'))
    const service = new RegisterWebhookEndpointService({ repo })

    await expect(service.register('org-1', 'https://nonexistent.example/hook')).rejects.toThrow(
      'SSRF: DNS resolution failed',
    )
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('returns the plaintext secret exactly once on success', async () => {
    repo.countByOrg.mockResolvedValue(0)
    const service = new RegisterWebhookEndpointService({ repo })

    const result = await service.register('org-1', 'https://example.com/hook', 'Primary')

    expect(result.endpoint.orgId).toBe('org-1')
    expect(result.endpoint.url).toBe('https://example.com/hook')
    expect(result.endpoint.description).toBe('Primary')
    expect(result.plaintextSecret).toMatch(/^whsec_[a-f0-9]{64}$/)
    expect(repo.save).toHaveBeenCalledTimes(1)
  })
})
